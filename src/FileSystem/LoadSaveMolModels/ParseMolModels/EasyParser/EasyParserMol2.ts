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
        const prts = src.contents.split("@<TRIPOS>ATOM");
        let atoms = prts[1].split("@<TRIPOS>")[0];

        // While first char is newline, remove it
        while (atoms[0] === "\n") {
            atoms = atoms.slice(1);
        }

        // Trim the right side.
        atoms = atoms.trimRight();

        this._atoms = atoms.split("\n").map((atom: string) => atom.trim());
    }

    /**
     * Parse an atom.
     * 
     * @param {string} atomStr The string to parse.
     * @returns {IAtom} The parsed atom.
     */
    _parseAtomStr(atomStr: string): IAtom {
        // Atom looks like this:
        // "     31  C4        39.2670   22.5690   13.2440 C.ar  501  ATP501      0.1692"

        // Split by spaces.
        const [serialOrig, atomName, xOrig, yOrig, zOrig, elemOrig, resiOrig, resn, bOrig] = atomStr.split(/\s+/);
        const serial = parseInt(serialOrig);
        const x = parseFloat(xOrig);
        const y = parseFloat(yOrig);
        const z = parseFloat(zOrig);
        const elem = elemOrig.split(".")[0]
        const resi = parseInt(resiOrig);
        const b = parseFloat(bOrig);
        
        // In this context, b is the charge.

        // Some not specified
        const chain = "A";
        const altLoc = " ";

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