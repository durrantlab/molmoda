import { GLModel } from "@/UI/Panels/Viewer/GLModelType";
import { EasyParserParent } from "./EasyParserParent";
import { EasyParserGLModel } from "./EasyParserGLModel";
import { EasyParserPDB } from "./EasyParserPDB";
import { IFileInfo } from "@/FileSystem/Types";
import { FileInfo } from "@/FileSystem/FileInfo";
import { getFormatInfoGivenType } from "../../Types/MolFormats";
import {
    EasyParserWorkerClient,
    WORKER_ATOM_THRESHOLD,
} from "./EasyParserWorkerClient";
import type { BoundsResult, UniqueResiduesResult } from "./EasyParserWorkerTypes";
import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { EasyParserIAtomList } from "./EasyParserIAtomList";
import { EasyParserMol2 } from "./EasyParserMol2";
import { EasyParserSDF } from "./EasyParserSDF";

/**
 * This function creates an EasyParser object from a given source.
 *
 * @param {IFileInfo | GLModel | IAtom[] | undefined} src The source to parse.
 * @returns {EasyParserParent} The EasyParser object.
 */
export function makeEasyParser(
    src: IFileInfo | GLModel | IAtom[] | undefined
): EasyParserParent {
    // If undefined, return an empty parser.
    if (src === undefined) {
        return new EasyParserIAtomList([]);
    }

    // If its an array, assume it's an atom list.
    if (Array.isArray(src)) {
        return new EasyParserIAtomList(src);
    }

    if ((src as GLModel).selectedAtoms !== undefined) {
        return new EasyParserGLModel(src);
    }

    // Get the file type from the FileInfo object.
    const typ = new FileInfo(src as IFileInfo).getFileType();

    const formatInfo = getFormatInfoGivenType(typ as string);

    if (formatInfo?.primaryExt === "pdb") {
        return new EasyParserPDB(src as IFileInfo);
    }
    if (formatInfo?.primaryExt === "sdf" || formatInfo?.primaryExt === "mol") {
        return new EasyParserSDF(src as IFileInfo);
    }
    if (formatInfo?.primaryExt === "mol2") {
        return new EasyParserMol2(src as IFileInfo);
    }

    // Format not explicitly handled (e.g. MOLMODA, ZIP, or unknown).
    // Return empty parser to avoid errors from incorrect parsing attempts.
    return new EasyParserIAtomList([]);


    // // Fallback or throw error if format not supported by EasyParsers
    // console.warn(
    //     `EasyParser: Format "${typ}" (primaryExt: "${formatInfo?.primaryExt}") not explicitly handled. Defaulting to Mol2 parser, which may not be correct.`
    // );
    // // As a last resort, try Mol2 parser, or consider throwing an error.
    // return new EasyParserMol2(src as IFileInfo);
}

// ── Worker-backed parser handle ─────────────────────────────────────

/**
 * Thin wrapper returned by `makeEasyParserAsync` when the atom count exceeds
 * `WORKER_ATOM_THRESHOLD`.  Holds only the worker handle string and
 * delegates every operation to the shared `EasyParserWorkerClient`.
 *
 * Call `dispose()` when done to free the worker-side parser memory.
 */
export class WorkerParserHandle {
    /** The opaque handle referencing the parser inside the worker. */
    public readonly handle: string;
    private readonly _client: EasyParserWorkerClient;

    /**
     * Create a new WorkerParserHandle.
     *
     * @param {string}                 handle  The opaque handle referencing the
     *                                         parser inside the worker.
     * @param {EasyParserWorkerClient} client  The EasyParserWorkerClient
     *                                         instance to use for delegating
     *                                         operations.
     */
    constructor(handle: string, client: EasyParserWorkerClient) {
        this.handle = handle;
        this._client = client;
    }

    /** Release the parser instance in the worker. */
    async dispose(): Promise<void> {
        await this._client.destroyParser(this.handle);
    }

    /**
     * Get all atoms from the parser.
     * 
     * @returns {Promise<IAtom[]>} A promise that resolves to the list of atoms.
     */
    async getAtoms(): Promise<IAtom[]> {
        return this._client.getAtoms(this.handle);
    }

    /**
     * Get a single atom by index.
     * 
     * @param {number} index The 0-based index of the atom to retrieve.
     * @returns {Promise<IAtom>} A promise that resolves to the requested atom.
     */
    async getAtom(index: number): Promise<IAtom> {
        return this._client.getAtom(this.handle, index);
    }

    /**
     * Get the number of atoms in the parser.
     *
     * @returns {Promise<number>} A promise that resolves to the number of
     *     atoms.
     */
    async getLength(): Promise<number> {
        return this._client.getLength(this.handle);
    }

    /**
     * Get the bounding box of the atoms.
     * 
     * @param {number} [stride] Optional stride to use when iterating atoms for
     *                          bounding box calculation (e.g. for performance).
     * @returns {Promise<BoundsResult | null>} A promise that resolves to the
     *     bounding box result or null if no atoms are present.
     */
    async getBounds(stride?: number): Promise<BoundsResult | null> {
        return this._client.getBounds(this.handle, stride);
    }

    /**
     * Get atoms matching the selection criteria.
     *
     * @param {object} sel         Selection criteria as a mapping of property
     *                             names to arrays of accepted values (e.g. {
     *                             chain: ["A", "B"] }).
     * @param {boolean} [extract]  Whether to return only the selected atoms
     *                             (true) or all atoms with a "selected" flag
     *                             (false). Default is false.
     * @returns {Promise<IAtom[]>} A promise that resolves to the list of
     *     selected atoms.
     */
    async selectedAtoms(
        sel: { [key: string]: string[] },
        extract = false
    ): Promise<IAtom[]> {
        return this._client.selectedAtoms(this.handle, sel, extract);
    }

    /**
     * Check if any atom in this parser is within a certain distance of any atom
     * in another parser.
     *
     * @param {WorkerParserHandle} otherHandle  The handle of the other parser
     *                                          to compare against.
     * @param {number} distance                 The distance threshold.
     * @param {number} [selfStride]             Optional stride for iterating
     *                                          this parser's atoms (e.g. for
     *                                          performance).
     * @param {number} [otherStride]            Optional stride for iterating
     *                                          the other parser's atoms.
     * @returns {Promise<boolean>} A promise that resolves to true if any atom
     *     pairs are within the specified distance,
     *     false otherwise.
     */
    async isWithinDistance(
        otherHandle: WorkerParserHandle,
        distance: number,
        selfStride?: number,
        otherStride?: number
    ): Promise<boolean> {
        return this._client.isWithinDistance(
            this.handle,
            otherHandle.handle,
            distance,
            selfStride,
            otherStride
        );
    }

    /**
     * Check if the molecule is flat (all coords zero in one dimension).
     *
     * @returns {Promise<boolean>} True if all atoms have zero X or all have
     *     zero Y or all have zero Z.
     */
    async isFlat(): Promise<boolean> {
        return this._client.isFlat(this.handle);
    }

    /**
     * Check if any atom is hydrogen.
     *
     * @returns {Promise<boolean>}  True if at least one hydrogen atom exists.
     */
    async hasHydrogens(): Promise<boolean> {
        return this._client.hasHydrogens(this.handle);
    }

    /**
     * Get unique residue names and IDs.
     *
     * @returns {Promise<UniqueResiduesResult>} Unique residue names and IDs.
     */
    async getUniqueResidues(): Promise<UniqueResiduesResult> {
        return this._client.getUniqueResidues(this.handle);
    }

    /**
     * Append atoms to the parser.
     *
     * @param {IAtom | IAtom[]} atoms  The atom or atoms to append.
     * @returns {Promise<void>} A promise that resolves when the operation is
     *     complete.
     */
    async appendAtoms(atoms: IAtom | IAtom[]): Promise<void> {
        return this._client.appendAtoms(this.handle, atoms);
    }
}

/**
 * Result type for `makeEasyParserAsync`.  Either a synchronous
 * `EasyParserParent` (small molecule, runs on main thread) or a
 * `WorkerParserHandle` (large molecule, runs in dedicated worker).
 */
export type AsyncParserResult = EasyParserParent | WorkerParserHandle;

/**
 * Determine whether a result from `makeEasyParserAsync` is worker-backed.
 *
 * @param {AsyncParserResult} result  The parser result to check.
 * @returns {boolean}  True if the parser lives in the worker.
 */
export function isWorkerParser(
    result: AsyncParserResult
): result is WorkerParserHandle {
    return result instanceof WorkerParserHandle;
}

/**
 * Async factory that creates an EasyParser on the main thread for small
 * molecules (< WORKER_ATOM_THRESHOLD atoms) or in a dedicated web worker
 * for large molecules.
 *
 * For worker-backed parsers, callers MUST call `dispose()` on the returned
 * `WorkerParserHandle` when done to avoid leaking memory in the worker.
 *
 * @param {IFileInfo} src  File info with name and contents.
 * @returns {Promise<AsyncParserResult>}  Either a synchronous parser or a
 *     worker-backed handle.
 */
export async function makeEasyParserAsync(
    src: IFileInfo
): Promise<AsyncParserResult> {
    // First, do a quick main-thread parse to check atom count.  For very
    // large files even this initial parse could be slow, but we need the
    // count to decide routing.  We use the synchronous parser which lazily
    // parses atom lines, so constructing it is cheap (just splits lines).
    const localParser = makeEasyParser(src);
    const atomCount = localParser.length;

    if (atomCount < WORKER_ATOM_THRESHOLD) {
        // Small molecule: keep the already-constructed local parser.
        return localParser;
    }

    // Large molecule: offload to the worker. Create a plain object with
    // only serializable properties to avoid DataCloneError when posting
    // to the worker (FileInfo class instances have methods and possibly
    // Vue reactivity proxies that cannot be cloned).
    const client = EasyParserWorkerClient.getInstance();
    const plainFileInfo: IFileInfo = {
        name: src.name,
        contents: src.contents,
    };
    const handle = await client.createParser(plainFileInfo);
    return new WorkerParserHandle(handle, client);
}