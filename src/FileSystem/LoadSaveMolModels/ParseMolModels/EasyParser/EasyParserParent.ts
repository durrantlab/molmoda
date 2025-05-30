// Originally, I repurposed the 3dmol.js parser for when plugins need to access
// information about atoms. But I came to realize that this is overkill. I'm now
// going to create a minimal parser for PDB and MOL2 files instead, since these
// are the formats that molmoda uses internally for protein and compound files,
// respectively. It doens't need to have a lot of functionality. It just needs
// to be light on memory.

import { IFileInfo } from "@/FileSystem/Types";
import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { GLModel } from "@/UI/Panels/Viewer/GLModelType";

/** Interface for bounding box */
interface IBounds {
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxY: number;
    maxZ: number;
}

/**
 * A parent class for easy parsers.
 */
export abstract class EasyParserParent {
    /**
     * Create a new EasyParserParent.
     *
     * @param {IFileInfo | GLModel | IAtom[]} src The source to parse.
     */
    constructor(src: IFileInfo | GLModel | IAtom[]) {
        this._load(src);
    }
    protected _atoms: (string | IAtom)[] = [];

    /**
     * Load the source.
     *
     * @param {IFileInfo | GLModel | IAtom[]} src  The source to parse.
     */
    abstract _load(src: IFileInfo | GLModel | IAtom[]): void;

    /**
     * Parse an atom.
     *
     * @param {string} atomStr The string to parse.
     * @param {number} [atomParserIndex] Optional: The 0-based index of this
     *                                   atom in the parser's internal list.
     *                                   Useful for parsers that need context
     *                                   (e.g., SDF bond parsing).
     * @returns {IAtom | undefined} The parsed atom, or undefined if not
     *  parsable or function not used.
     */
    abstract _parseAtomStr(
        atomStr: string,
        atomParserIndex?: number
    ): IAtom | undefined;
    /**
     * Get the atom at the given index.
     *
     * @param {number} idx  The index.
     * @returns {IAtom} The atom.
     */
    getAtom(idx: number): IAtom {
        const atom = this._atoms[idx];

        // If it's not a string, it's already been parsed.
        if (typeof atom !== "string") {
            return atom as IAtom;
        }
        const parsedAtom = this._parseAtomStr(atom as string, idx); // Pass the index here
        if (parsedAtom === undefined) {
            throw new Error("Failed to parse atom.");
        }
        this._atoms[idx] = parsedAtom; // Cache the parsed atom
        return parsedAtom;
    }

    /**
     * The number of atoms.
     *
     * @returns {number} The number of atoms.
     */
    get length(): number {
        return this._atoms.length;
    }

    /**
     * The atoms.
     *
     * @returns {IAtom[]} The atoms.
     */
    get atoms(): IAtom[] {
        return this._atoms.map((atom, idx) => {
            return this.getAtom(idx);
        });
    }

    /**
     * Get the selected atoms.
     *
     * @param {object}  sel              The selection.
     * @param {boolean} [extract=false]  Whether to extract the selected atoms.
     * @returns {IAtom[]} The selected atoms.
     */
    selectedAtoms(sel: { [key: string]: string[] }, extract = false): IAtom[] {
        // NOTE: If there are multiple keys, logical OR is applied. So this
        // differs from the 3dmol selectedAtoms function.

        // Not going to support full selectedAtoms available in 3dmol parser.
        // Just bare-bones minimum.

        // You'll need to parse all the atoms.
        let atoms: [number, IAtom][] = [];
        for (let i = 0; i < this.length; i++) {
            atoms.push([i, this.getAtom(i)]);
        }

        const keys = Object.keys(sel);

        // If there are no keys, return all the atoms.
        if (keys.length === 0) {
            if (extract) {
                this._atoms = [];
            }
            return atoms.map(([idx, atom]) => atom);
        }

        let matchingAtoms: [number, IAtom][] = [];

        for (const key of keys) {
            const val = sel[key];

            let filterFunc: (atom: IAtom) => boolean = (atom: IAtom) => true;

            switch (key) {
                case "resn":
                    filterFunc = (atom) => val.includes(atom.resn);
                    break;
                case "chain":
                    filterFunc = (atom) => val.includes(atom.chain);
                    break;
                case "elem":
                    filterFunc = (atom) => {
                        if (atom.elem === undefined) {
                            return false;
                        }
                        return val.includes(atom.elem);
                    };
                    break;
                default:
                    // Should never get here.
                    debugger;
            }

            matchingAtoms = matchingAtoms.concat(
                atoms.filter(([idx, atom]) => filterFunc(atom))
            );

            // Remove matches from atoms.
            atoms = atoms.filter(([idx, atom]) => !filterFunc(atom));
        }

        if (extract) {
            // sort by index
            matchingAtoms.sort(([idx1, atom1], [idx2, atom2]) => idx1 - idx2);
            this._atoms = atoms.map(([idx, atom]) => atom);
        }

        // sort by index
        matchingAtoms.sort(([idx1, atom1], [idx2, atom2]) => idx1 - idx2);
        return matchingAtoms.map(([idx, atom]) => atom);
    }

    /**
     * Append atoms to the molecule.
     *
     * @param {IAtom[]} atoms  The atoms to append.
     */
    appendAtoms(atoms: IAtom | IAtom[]): void {
        if (!Array.isArray(atoms)) {
            atoms = [atoms];
        }
        this._atoms = this._atoms.concat(atoms);
    }

    /**
     * Calculates the bounding box of the atoms in this parser, considering the stride.
     *
     * @param {number} [stride=1] The step size for iterating through atoms. Must be >= 1.
     * @returns {IBounds | null} The bounding box, or null if no atoms with coordinates are found.
     */
    getBounds(stride = 1): IBounds | null {
        if (stride < 1) {
            throw new Error("Stride must be >= 1");
        }

        let minX = Infinity;
        let minY = Infinity;
        let minZ = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let maxZ = -Infinity;
        let foundCoords = false;

        for (let i = 0; i < this.length; i += stride) {
            const atom = this.getAtom(i);
            if (
                atom.x !== undefined &&
                atom.y !== undefined &&
                atom.z !== undefined
            ) {
                foundCoords = true;
                minX = Math.min(minX, atom.x);
                minY = Math.min(minY, atom.y);
                minZ = Math.min(minZ, atom.z);
                maxX = Math.max(maxX, atom.x);
                maxY = Math.max(maxY, atom.y);
                maxZ = Math.max(maxZ, atom.z);
            }
        }

        if (!foundCoords) {
            return null; // No atoms with coordinates found
        }

        return { minX, minY, minZ, maxX, maxY, maxZ };
    }

    /**
     * Checks if any atom in this parser is within a specified distance of any atom
     * in another parser, optionally using strides to speed up the check.
     * Optimized with bounding box check and early exit for distance components.
     *
     * @param {EasyParserParent} otherParser The other parser to compare against.
     * @param {number}           distance    The distance threshold in Angstroms.
     * @param {number}           [selfStride=1] The step size for iterating through
     *                           atoms in this parser. Must be >= 1.
     * @param {number}           [otherStride=1] The step size for iterating through
     *                           atoms in the other parser. Must be >= 1.
     * @returns {boolean} True if at least one pair of atoms (one from each parser,
     *          considering strides) is within the specified distance, false otherwise.
     */
    isWithinDistance(
        otherParser: EasyParserParent,
        distance: number,
        selfStride = 1,
        otherStride = 1
    ): boolean {
        // Validate strides
        if (selfStride < 1) {
            throw new Error("selfStride must be >= 1");
        }
        if (otherStride < 1) {
            throw new Error("otherStride must be >= 1");
        }

        const distanceSqThreshold = distance * distance; // Compare squared distances

        // *** Optimization 1: Bounding Box Check ***
        const bounds1 = this.getBounds(selfStride);
        const bounds2 = otherParser.getBounds(otherStride);

        // If either molecule has no coordinates, they can't be close
        if (!bounds1 || !bounds2) {
            return false;
        }

        // Check for non-overlap (expanded by distance)
        if (
            bounds1.maxX < bounds2.minX - distance ||
            bounds1.minX > bounds2.maxX + distance ||
            bounds1.maxY < bounds2.minY - distance ||
            bounds1.minY > bounds2.maxY + distance ||
            bounds1.maxZ < bounds2.minZ - distance ||
            bounds1.minZ > bounds2.maxZ + distance
        ) {
            return false; // Bounding boxes are too far apart
        }
        // *** End Bounding Box Check ***

        for (let i = 0; i < this.length; i += selfStride) {
            const atom1 = this.getAtom(i);
            // Ensure atom1 has coordinates
            if (
                atom1.x === undefined ||
                atom1.y === undefined ||
                atom1.z === undefined
            ) {
                continue;
            }
            // *** Optimization 2: Cache atom1 coordinates ***
            const x1 = atom1.x;
            const y1 = atom1.y;
            const z1 = atom1.z;

            for (let j = 0; j < otherParser.length; j += otherStride) {
                const atom2 = otherParser.getAtom(j);
                // Ensure atom2 has coordinates
                if (
                    atom2.x === undefined ||
                    atom2.y === undefined ||
                    atom2.z === undefined
                ) {
                    continue;
                }
                const x2 = atom2.x; // Cache atom2 coordinate

                // Calculate squared distance component by component for early exit
                const dx = x1 - x2;
                const dxSq = dx * dx;
                if (dxSq > distanceSqThreshold) {
                    continue; // X distance alone is too large
                }

                const y2 = atom2.y; // Cache atom2 coordinate
                const dy = y1 - y2;
                const dySq = dy * dy;
                if (dxSq + dySq > distanceSqThreshold) {
                    continue; // X + Y distance is too large
                }

                const z2 = atom2.z; // Cache atom2 coordinate
                const dz = z1 - z2;
                const dzSq = dz * dz;
                const distanceSq = dxSq + dySq + dzSq;

                // Check if within threshold
                if (distanceSq <= distanceSqThreshold) {
                    return true; // Found a pair within distance
                }
            }
        }

        return false; // No pairs found within distance
    }

    /**
     * Get the approximate bounds of the molecule. NOTE: This code not used, but
     * could be useful in the future.
     *
     * @returns {number[]} The approximate bounds [minX, minY, minZ, maxX, maxY,
     *     maxZ].
     */
    //     getApproximateBounds(): [number, number, number, number, number, number] {
    //         let minX = Infinity;
    //         let minY = Infinity;
    //         let minZ = Infinity;
    //         let maxX = -Infinity;
    //         let maxY = -Infinity;
    //         let maxZ = -Infinity;

    //         const buffer = 5;
    //         const step = 10;

    //         for (let i = 0; i < this.length; i += step) {
    //             const atom = this.getAtom(i);

    //             minX = Math.min(minX, atom.x as number);
    //             minY = Math.min(minY, atom.y as number);
    //             minZ = Math.min(minZ, atom.z as number);
    //             maxX = Math.max(maxX, atom.x as number);
    //             maxY = Math.max(maxY, atom.y as number);
    //             maxZ = Math.max(maxZ, atom.z as number);
    //         }

    //         return [
    //             minX - buffer,
    //             minY - buffer,
    //             minZ - buffer,
    //             maxX + buffer,
    //             maxY + buffer,
    //             maxZ + buffer,
    //         ];
    //     }
}
