// Originally, I repurposed the 3dmol.js parser for when plugins need to access
// information about atoms. But I came to realize that this is overkill. I'm now
// going to create a minimal parser for PDB and MOL2 files instead, since these
// are the formats that molmoda uses internally for protein and compound files,
// respectively. It doens't need to have a lot of functionality. It just needs
// to be light on memory.

// resn,resi,chain

import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { EasyParserParent } from "./EasyParserParent";
import { IFileInfo } from "@/FileSystem/Types";
import { twoLetterElems } from "../../NameVars";

/**
 * A parser for PDB files.
 */
export class EasyParserPDB extends EasyParserParent {
    /**
     * Load the source.
     *
     * @param {IFileInfo} src  The source to parse.
     */
    _load(src: IFileInfo): void {
        const atomLines = src.contents.split("\n");

        // Keep only lines that start with ATOM or HETATM
        this._atoms = atomLines.filter((line: string) => {
            return line.startsWith("ATOM") || line.startsWith("HETATM");
        });
    }

    /**
     * Parse an atom.
     * 
     * @param {number} idx The index of the atom.
     * @returns {IAtom} The parsed atom.
     */
    parseAtom(idx: number): IAtom {
        const atom = this._atoms[idx];

        // If it's not a string, it's already been parsed.
        if (typeof atom !== "string") {
            return atom as IAtom;
        }

        // You must parse it.
        const atomName = atom.slice(12, 16).trim();
        const serial = parseInt(atom.slice(6, 11).trim());
        const altLoc = atom.slice(16, 17);
        const resn = atom.slice(17, 20).trim();
        const chain = atom.slice(21, 22);
        const resi = parseInt(atom.slice(22, 26).trim());
        const x = parseFloat(atom.slice(30, 38).trim());
        const y = parseFloat(atom.slice(38, 46).trim());
        const z = parseFloat(atom.slice(46, 54).trim());
        const b = parseFloat(atom.slice(60, 66).trim());

        let elem = atom.slice(76, 78).trim();
        if (elem === "") {
            // Get first two letters of atom name
            elem = atom.slice(12, 14).trim();
            // Make upper case
            elem = elem.toUpperCase();
            // If it's not in twoLetterElems, get first letter.
            if (twoLetterElems.indexOf(elem) === -1) {
                elem = elem[0];
            }
        }
        if (elem.length > 1) {
            // Otherwise, make all but first letter lowercase.
            elem = elem[0] + elem.slice(1).toLowerCase();
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
