/**
 * Shared type definitions for the EasyParser web worker protocol.
 *
 * The worker holds a registry of EasyParser instances keyed by handle ID.
 * The main thread sends batched commands referencing handles, and the worker
 * returns results in the same order. This avoids per-call postMessage
 * overhead while keeping the API surface explicit and type-safe.
 */

import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { IFileInfo } from "@/FileSystem/Types";

// ── Handle lifecycle ────────────────────────────────────────────────

export interface CreateParserCmd {
    op: "createParser";
    /** Caller-chosen handle that subsequent commands reference. */
    handle: string;
    /** Raw file info (name + contents) to construct the parser from. */
    src: IFileInfo;
}

export interface DestroyParserCmd {
    op: "destroyParser";
    handle: string;
}

// ── Query commands (do not mutate the parser) ───────────────────────

export interface GetAtomsCmd {
    op: "getAtoms";
    handle: string;
}

export interface GetAtomCmd {
    op: "getAtom";
    handle: string;
    index: number;
}

export interface GetLengthCmd {
    op: "getLength";
    handle: string;
}

export interface GetBoundsCmd {
    op: "getBounds";
    handle: string;
    stride?: number;
}

export interface SelectedAtomsCmd {
    op: "selectedAtoms";
    handle: string;
    sel: { [key: string]: string[] };
    extract?: boolean;
}

export interface IsWithinDistanceCmd {
    op: "isWithinDistance";
    handle: string;
    /** Handle of the *other* parser already in the registry. */
    otherHandle: string;
    distance: number;
    selfStride?: number;
    otherStride?: number;
}

export interface IsFlatCmd {
    op: "isFlat";
    handle: string;
}

export interface HasHydrogensCmd {
    op: "hasHydrogens";
    handle: string;
}

export interface GetUniqueResiduesCmd {
    op: "getUniqueResidues";
    handle: string;
}

export interface AppendAtomsCmd {
    op: "appendAtoms";
    handle: string;
    atoms: IAtom | IAtom[];
}

/**
 * Create a parser from an IAtom[] array rather than from file contents.
 * Useful when the main thread already has parsed atoms (e.g., from
 * selectedAtoms extract results) and wants to push them into the worker.
 */
export interface CreateParserFromAtomsCmd {
    op: "createParserFromAtoms";
    handle: string;
    atoms: IAtom[];
}

// ── Union of all commands ───────────────────────────────────────────

export type EasyParserWorkerCmd =
    | CreateParserCmd
    | CreateParserFromAtomsCmd
    | DestroyParserCmd
    | GetAtomsCmd
    | GetAtomCmd
    | GetLengthCmd
    | GetBoundsCmd
    | SelectedAtomsCmd
    | IsWithinDistanceCmd
    | IsFlatCmd
    | HasHydrogensCmd
    | GetUniqueResiduesCmd
    | AppendAtomsCmd;

// ── Batch request / response envelope ───────────────────────────────

export interface EasyParserWorkerRequest {
    /** Monotonically increasing ID so responses can be correlated. */
    requestId: number;
    commands: EasyParserWorkerCmd[];
}

export interface EasyParserWorkerResponse {
    requestId: number;
    /**
     * One result per command, in the same order.  `null` for void commands
     * (create, destroy, appendAtoms).  On error the entry is an object
     * with an `error` string.
     */
    results: (unknown | null | { error: string })[];
}

// ── Convenience result sub-types for type-narrowing on the client ───

export interface BoundsResult {
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxY: number;
    maxZ: number;
}

export interface UniqueResiduesResult {
    names: string[];
    ids: number[];
}