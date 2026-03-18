/**
 * Main-thread client that wraps a dedicated EasyParser web worker.
 *
 * For molecules above `WORKER_ATOM_THRESHOLD` atoms the client sends
 * batched commands to the worker; below the threshold the original
 * synchronous EasyParser classes are used directly (no overhead).
 *
 * Usage:
 *   const client = EasyParserWorkerClient.getInstance();
 *   const handle = await client.createParser(fileInfo);
 *   const atoms  = await client.getAtoms(handle);
 *   await client.destroyParser(handle);
 *
 * Handles are caller-chosen strings.  For convenience, `createParser`
 * auto-generates one and returns it.
 */

import { randomID } from "@/Core/Utils/MiscUtils";
import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { IFileInfo } from "@/FileSystem/Types";
import type {
    EasyParserWorkerCmd,
    EasyParserWorkerRequest,
    EasyParserWorkerResponse,
    BoundsResult,
    UniqueResiduesResult,
} from "./EasyParserWorkerTypes";

/**
 * Atom-count threshold above which parsing is offloaded to the worker.
 * Below this the synchronous main-thread parser is used for zero overhead.
 */
export const WORKER_ATOM_THRESHOLD = 1_000;

type PendingResolve = (resp: EasyParserWorkerResponse) => void;

export class EasyParserWorkerClient {
    private static _instance: EasyParserWorkerClient | null = null;

    private _worker: Worker;
    private _nextRequestId = 0;
    private _pending = new Map<number, PendingResolve>();

    private constructor() {
        this._worker = new Worker(
            new URL("./EasyParser.worker", import.meta.url)
        );
        this._worker.onmessage = this._onMessage.bind(this);
    }

    /**
     * Return the singleton client, lazily creating the worker on first call.
     *
     * @returns {EasyParserWorkerClient}  The shared client instance.
     */
    public static getInstance(): EasyParserWorkerClient {
        if (!EasyParserWorkerClient._instance) {
            EasyParserWorkerClient._instance =
                new EasyParserWorkerClient();
        }
        return EasyParserWorkerClient._instance;
    }

    /**
     * Terminate the background worker and clear the singleton.
     * Useful for tests or application shutdown.
     */
    public dispose(): void {
        this._worker.terminate();
        this._pending.clear();
        EasyParserWorkerClient._instance = null;
    }

    // ── High-level convenience methods ──────────────────────────────

    /**
     * Create an EasyParser in the worker from file contents.
     *
     * @param {IFileInfo} src     The file info (name + contents) to parse.
     * @param {string}    [handle]  Optional caller-chosen handle.
     * @returns {Promise<string>}  The handle for subsequent commands.
     */
    public async createParser(
        src: IFileInfo,
        handle?: string
    ): Promise<string> {
        const h = handle ?? `ep_${randomID()}`;
        await this._send([{ op: "createParser", handle: h, src }]);
        return h;
    }

    /**
     * Create an EasyParser in the worker from an already-parsed atom array.
     *
     * @param {IAtom[]}  atoms    The atoms to register.
     * @param {string}   [handle] Optional caller-chosen handle.
     * @returns {Promise<string>}  The handle for subsequent commands.
     */
    public async createParserFromAtoms(
        atoms: IAtom[],
        handle?: string
    ): Promise<string> {
        const h = handle ?? `ep_${randomID()}`;
        await this._send([
            { op: "createParserFromAtoms", handle: h, atoms },
        ]);
        return h;
    }

    /**
     * Release a parser instance inside the worker.
     *
     * @param {string} handle  The parser handle to destroy.
     */
    public async destroyParser(handle: string): Promise<void> {
        await this._send([{ op: "destroyParser", handle }]);
    }

    /**
     * Retrieve all atoms from the parser.
     *
     * @param {string} handle  The parser handle.
     * @returns {Promise<IAtom[]>}  The full atom array.
     */
    public async getAtoms(handle: string): Promise<IAtom[]> {
        const resp = await this._send([{ op: "getAtoms", handle }]);
        return resp.results[0] as IAtom[];
    }

    /**
     * Retrieve a single atom by index.
     *
     * @param {string} handle  The parser handle.
     * @param {number} index   Zero-based atom index.
     * @returns {Promise<IAtom>}  The atom at the given index.
     */
    public async getAtom(
        handle: string,
        index: number
    ): Promise<IAtom> {
        const resp = await this._send([
            { op: "getAtom", handle, index },
        ]);
        return resp.results[0] as IAtom;
    }

    /**
     * Get the number of atoms.
     *
     * @param {string} handle  The parser handle.
     * @returns {Promise<number>}  Atom count.
     */
    public async getLength(handle: string): Promise<number> {
        const resp = await this._send([{ op: "getLength", handle }]);
        return resp.results[0] as number;
    }

    /**
     * Get the axis-aligned bounding box of the parser's atoms.
     *
     * @param {string} handle  The parser handle.
     * @param {number} [stride]  Sampling stride.
     * @returns {Promise<BoundsResult | null>}  Bounds or null if no coords.
     */
    public async getBounds(
        handle: string,
        stride?: number
    ): Promise<BoundsResult | null> {
        const resp = await this._send([
            { op: "getBounds", handle, stride },
        ]);
        return resp.results[0] as BoundsResult | null;
    }

    /**
     * Select atoms matching a selection dictionary.
     *
     * @param {string}                       handle   The parser handle.
     * @param {{ [key: string]: string[] }}  sel      Selection criteria.
     * @param {boolean}                      [extract]  If true, matched atoms
     *     are removed from the parser's internal list (mutating operation).
     * @returns {Promise<IAtom[]>}  The selected atoms.
     */
    public async selectedAtoms(
        handle: string,
        sel: { [key: string]: string[] },
        extract = false
    ): Promise<IAtom[]> {
        const resp = await this._send([
            { op: "selectedAtoms", handle, sel, extract },
        ]);
        return resp.results[0] as IAtom[];
    }

    /**
     * Check whether any atom in one parser is within a distance of any atom
     * in another parser.
     *
     * @param {string} handle       First parser handle.
     * @param {string} otherHandle  Second parser handle (must already exist).
     * @param {number} distance     Distance threshold in angstroms.
     * @param {number} [selfStride]  Stride for self atoms.
     * @param {number} [otherStride] Stride for other atoms.
     * @returns {Promise<boolean>}  True if any pair is within distance.
     */
    public async isWithinDistance(
        handle: string,
        otherHandle: string,
        distance: number,
        selfStride?: number,
        otherStride?: number
    ): Promise<boolean> {
        const resp = await this._send([
            {
                op: "isWithinDistance",
                handle,
                otherHandle,
                distance,
                selfStride,
                otherStride,
            },
        ]);
        return resp.results[0] as boolean;
    }

    /**
     * Check if the molecule is flat (all coords zero in one dimension).
     *
     * @param {string} handle  The parser handle.
     * @returns {Promise<boolean>}
     */
    public async isFlat(handle: string): Promise<boolean> {
        const resp = await this._send([{ op: "isFlat", handle }]);
        return resp.results[0] as boolean;
    }

    /**
     * Check if any atom is hydrogen.
     *
     * @param {string} handle  The parser handle.
     * @returns {Promise<boolean>}
     */
    public async hasHydrogens(handle: string): Promise<boolean> {
        const resp = await this._send([
            { op: "hasHydrogens", handle },
        ]);
        return resp.results[0] as boolean;
    }

    /**
     * Get unique residue names and IDs.
     *
     * @param {string} handle  The parser handle.
     * @returns {Promise<UniqueResiduesResult>}
     */
    public async getUniqueResidues(
        handle: string
    ): Promise<UniqueResiduesResult> {
        const resp = await this._send([
            { op: "getUniqueResidues", handle },
        ]);
        return resp.results[0] as UniqueResiduesResult;
    }

    /**
     * Append atoms to an existing parser.
     *
     * @param {string}         handle  The parser handle.
     * @param {IAtom | IAtom[]} atoms   Atoms to append.
     */
    public async appendAtoms(
        handle: string,
        atoms: IAtom | IAtom[]
    ): Promise<void> {
        await this._send([{ op: "appendAtoms", handle, atoms }]);
    }

    // ── Bulk convenience methods ────────────────────────────────────

    /**
     * Creates multiple parsers from IFileInfo sources in parallel, returning
     * all handles once every parser is ready. Each parser is created via a
     * separate worker command, but all commands are dispatched concurrently
     * so the worker processes them back-to-back.
     *
     * @param {IFileInfo[]} sources  The file info objects to parse.
     * @returns {Promise<string[]>}  The handles, one per source, in order.
     */
    public async createParsersFromFiles(
        sources: IFileInfo[]
    ): Promise<string[]> {
        const promises = sources.map((src) => this.createParser(src));
        return Promise.all(promises);
    }

    /**
     * Creates multiple parsers from IAtom arrays in parallel.
     *
     * @param {IAtom[][]} atomArrays  The atom arrays to register.
     * @returns {Promise<string[]>}  The handles, one per array, in order.
     */
    public async createParsersFromAtomArrays(
        atomArrays: IAtom[][]
    ): Promise<string[]> {
        const promises = atomArrays.map((atoms) =>
            this.createParserFromAtoms(atoms)
        );
        return Promise.all(promises);
    }

    /**
     * Retrieves bounds for multiple parser handles in parallel.
     *
     * @param {string[]} handles  The parser handles.
     * @param {number}   [stride]  Optional sampling stride.
     * @returns {Promise<(BoundsResult | null)[]>}  Bounds per handle, in order.
     */
    public async getBoundsMultiple(
        handles: string[],
        stride?: number
    ): Promise<(BoundsResult | null)[]> {
        const promises = handles.map((h) => this.getBounds(h, stride));
        return Promise.all(promises);
    }

    /**
     * Retrieves unique residues for multiple parser handles in parallel.
     *
     * @param {string[]} handles  The parser handles.
     * @returns {Promise<UniqueResiduesResult[]>}  Results per handle, in order.
     */
    public async getUniqueResiduesMultiple(
        handles: string[]
    ): Promise<UniqueResiduesResult[]> {
        const promises = handles.map((h) => this.getUniqueResidues(h));
        return Promise.all(promises);
    }

    /**
     * Destroys multiple parser handles in parallel. Errors are suppressed
     * to ensure cleanup completes for all handles even if one fails.
     *
     * @param {string[]} handles  The parser handles to destroy.
     */
    public async destroyParsers(handles: string[]): Promise<void> {
        await Promise.allSettled(
            handles.map((h) => this.destroyParser(h))
        );
    }

    // ── Batch API (advanced) ────────────────────────────────────────

    /**
     * Send an arbitrary batch of commands in a single postMessage round-trip.
     * Callers that need to chain multiple operations efficiently should use
     * this instead of calling convenience methods one at a time.
     *
     * @param {EasyParserWorkerCmd[]} commands  The commands to execute.
     * @returns {Promise<EasyParserWorkerResponse>}  Response with one result
     *     per command.
     */
    public sendBatch(
        commands: EasyParserWorkerCmd[]
    ): Promise<EasyParserWorkerResponse> {
        return this._send(commands);
    }

    // ── Internals ───────────────────────────────────────────────────

    /**
     * Post a batch of commands to the worker and return the response promise.
     *
     * @param {EasyParserWorkerCmd[]} commands  The commands to send.
     * @returns {Promise<EasyParserWorkerResponse>}  The worker's response.
     */
    private _send(
        commands: EasyParserWorkerCmd[]
    ): Promise<EasyParserWorkerResponse> {
        const requestId = this._nextRequestId++;
        const request: EasyParserWorkerRequest = { requestId, commands };

        return new Promise<EasyParserWorkerResponse>((resolve) => {
            this._pending.set(requestId, resolve);
            this._worker.postMessage(request);
        });
    }

    /**
     * Handle incoming messages from the worker thread.
     *
     * @param {MessageEvent<EasyParserWorkerResponse>} event  The worker
     *     response.
     */
    private _onMessage(
        event: MessageEvent<EasyParserWorkerResponse>
    ): void {
        const resp = event.data;
        const resolve = this._pending.get(resp.requestId);
        if (resolve) {
            this._pending.delete(resp.requestId);
            resolve(resp);
        }
    }
}