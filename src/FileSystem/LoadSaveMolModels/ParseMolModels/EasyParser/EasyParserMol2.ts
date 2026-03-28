// Originally, I repurposed the 3dmol.js parser for when plugins need to access
// information about atoms. But I came to realize that this is overkill. I'm now
// going to create a minimal parser for PDB and MOL2 files instead, since these
// are the formats that molmoda uses internally for protein and compound files,
// respectively. It doens't need to have a lot of functionality. It just needs
// to be light on memory.

import { IFileInfo } from "@/FileSystem/Types";
import { EasyParserParent } from "./EasyParserParent";
import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";

/**
 * A parser for MOL2 files.
 */
export class EasyParserMol2 extends EasyParserParent {
    /**
     * Load the source.
     *
     * @param {IFileInfo} src  The source to parse.
     */
    _load(src: IFileInfo): void {
        if (src.contents.indexOf("@<TRIPOS>ATOM") === -1) {
            throw new Error("MOL2 file does not contain @<TRIPOS>ATOM section. Incorrect format?");
        }

        const prts = src.contents.split("@<TRIPOS>ATOM");
        let atoms = prts[1].split("@<TRIPOS>")[0];

        // While first char is newline, remove it
        while (atoms[0] === "\n") {
            atoms = atoms.slice(1);
        }

        // Trim the right side.
        atoms = atoms.trimRight();

        const atomLines = atoms.split("\n").map((atom: string) => atom.trim());
        this._atoms = atomLines.filter((line: string) => line.length > 0);
    }

    /**
     * Parse an atom.
     * 
     * @param {string} atomStr The string to parse.
     * @param {number} [atomParserIndex] Optional: The 0-based index of this atom in the parser's internal list.
     * @returns {IAtom} The parsed atom.
     */
    _parseAtomStr(atomStr: string, atomParserIndex?: number): IAtom | undefined {
        // Atom looks like this:
        // "     31  C4        39.2670   22.5690   13.2440 C.ar  501  ATP501      0.1692"

        if (!atomStr || atomStr.trim().length === 0) {
            return undefined;
        }
        
        const parts = atomStr.split(/\s+/);
        if (parts.length < 8) {
            return undefined;
        }
        
        // Split by spaces.

        const [serialOrig, atomName, xOrig, yOrig, zOrig, elemOrig, resiOrig, resn, bOrig] = parts;
        const serial = parseInt(serialOrig);
        const x = parseFloat(xOrig);
        const y = parseFloat(yOrig);
        const z = parseFloat(zOrig);
        const elem = elemOrig.split(".")[0]
        const resi = parseInt(resiOrig);
        const b = bOrig !== undefined ? parseFloat(bOrig) : 0;
        
        // In this context, b is the charge.

        // Some not specified
        const chain = "A";
        const altLoc = " ";

        if (isNaN(x) || isNaN(y) || isNaN(z)) {
            return undefined;
        }

        return {
            resn,
            chain,
            resi,
            x,
            y,
            z,
            bondOrder: [],
            bonds: [],
            elem,
            serial,
            altLoc,
            b,
            atom: atomName,
        };
    }
}