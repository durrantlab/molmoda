/**
 * Dedicated web worker for EasyParser operations on large molecular files.
 *
 * Maintains a registry of EasyParserParent instances keyed by caller-chosen
 * handle strings.  Accepts batched commands via postMessage and returns
 * results in the same order, minimising main-thread ↔ worker round-trips.
 *
 * This worker is long-lived (not auto-terminated after one message) so that
 * parser state can be reused across multiple command batches.
 */

import { makeEasyParser } from "./index";
import { EasyParserParent } from "./EasyParserParent";
import { EasyParserIAtomList } from "./EasyParserIAtomList";
import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { IFileInfo } from "@/FileSystem/Types";
import type {
    EasyParserWorkerRequest,
    EasyParserWorkerResponse,
    EasyParserWorkerCmd,
    BoundsResult,
    UniqueResiduesResult,
} from "./EasyParserWorkerTypes";

// ── Parser instance registry ────────────────────────────────────────

const registry = new Map<string, EasyParserParent>();

// ── Command dispatcher ──────────────────────────────────────────────

/**
 * Execute a single command against the registry and return its result.
 *
 * @param {EasyParserWorkerCmd} cmd  The command to execute.
 * @returns {unknown}  The command result, or `null` for void operations.
 */
function executeCommand(cmd: EasyParserWorkerCmd): unknown {
    switch (cmd.op) {
        // ── Lifecycle ───────────────────────────────────────────

        case "createParser": {
            const parser = makeEasyParser(cmd.src as IFileInfo);
            registry.set(cmd.handle, parser);
            return null;
        }

        case "createParserFromAtoms": {
            const parser = new EasyParserIAtomList(cmd.atoms);
            registry.set(cmd.handle, parser);
            return null;
        }

        case "destroyParser": {
            registry.delete(cmd.handle);
            return null;
        }

        // ── Queries ─────────────────────────────────────────────

        case "getLength": {
            return getParser(cmd.handle).length;
        }

        case "getAtom": {
            return getParser(cmd.handle).getAtom(cmd.index);
        }

        case "getAtoms": {
            return getParser(cmd.handle).atoms;
        }

        case "getBounds": {
            const bounds = getParser(cmd.handle).getBounds(cmd.stride);
            if (bounds === null) return null;
            return bounds as BoundsResult;
        }

        case "selectedAtoms": {
            return getParser(cmd.handle).selectedAtoms(
                cmd.sel,
                cmd.extract ?? false
            );
        }

        case "isWithinDistance": {
            const self = getParser(cmd.handle);
            const other = getParser(cmd.otherHandle);
            return self.isWithinDistance(
                other,
                cmd.distance,
                cmd.selfStride ?? 1,
                cmd.otherStride ?? 1
            );
        }

        case "isFlat": {
            return getParser(cmd.handle).isFlat();
        }

        case "hasHydrogens": {
            return getParser(cmd.handle).hasHydrogens();
        }

        case "getUniqueResidues": {
            const res = getParser(cmd.handle).getUniqueResidues();
            // Sets are not structured-cloneable; convert to arrays.
            return {
                names: Array.from(res.names),
                ids: Array.from(res.ids),
            } as UniqueResiduesResult;
        }

        // ── Mutations ───────────────────────────────────────────

        case "appendAtoms": {
            getParser(cmd.handle).appendAtoms(cmd.atoms);
            return null;
        }

        default: {
            // Exhaustiveness guard — TypeScript will flag if a case is missed.
            const _exhaustive: never = cmd;
            throw new Error(`Unknown command op: ${(_exhaustive as EasyParserWorkerCmd).op}`);
        }
    }
}

/**
 * Retrieve a parser from the registry, throwing if the handle is unknown.
 *
 * @param {string} handle  The parser handle to look up.
 * @returns {EasyParserParent}  The parser instance.
 */
function getParser(handle: string): EasyParserParent {
    const parser = registry.get(handle);
    if (!parser) {
        throw new Error(
            `EasyParser worker: unknown handle "${handle}". ` +
            `Did you forget to send a createParser command first?`
        );
    }
    return parser;
}

// ── Message listener ────────────────────────────────────────────────

self.onmessage = (event: MessageEvent<EasyParserWorkerRequest>) => {
    const { requestId, commands } = event.data;
    const results: (unknown | null | { error: string })[] = [];

    for (const cmd of commands) {
        try {
            results.push(executeCommand(cmd));
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : String(err);
            results.push({ error: message });
        }
    }

    const response: EasyParserWorkerResponse = { requestId, results };
    self.postMessage(response);
};