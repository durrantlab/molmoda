// Originally, I repurposed the 3dmol.js parser for when plugins need to access
// information about atoms. But I came to realize that this is overkill. I'm now
// going to create a minimal parser for PDB and MOL2 files instead, since these
// are the formats that molmoda uses internally for protein and compound files,
// respectively. It doens't need to have a lot of functionality. It just needs
// to be light on memory.

import { IFileInfo } from "@/FileSystem/Types";
import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { GLModel } from "@/UI/Panels/Viewer/GLModelType";

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
     * @returns {IAtom | undefined} The parsed atom, or undefined if not
     *     parsable or function not used.
     */
    abstract _parseAtomStr(atomStr: string): IAtom | undefined;

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

        const parsedAtom = this._parseAtomStr(atom as string);
        if (parsedAtom === undefined) {
            throw new Error("Failed to parse atom.");
        }

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
