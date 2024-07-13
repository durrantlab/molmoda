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
     * @param {string} atomStr The string to parse.
     * @returns {IAtom} The parsed atom.
     */
    _parseAtomStr(atomStr: string): IAtom {
        // You must parse it.
        const atomName = atomStr.slice(12, 16).trim();
        const serial = parseInt(atomStr.slice(6, 11).trim());
        const altLoc = atomStr.slice(16, 17);
        const resn = atomStr.slice(17, 20).trim();
        const chain = atomStr.slice(21, 22);
        const resi = parseInt(atomStr.slice(22, 26).trim());
        const x = parseFloat(atomStr.slice(30, 38).trim());
        const y = parseFloat(atomStr.slice(38, 46).trim());
        const z = parseFloat(atomStr.slice(46, 54).trim());
        const b = parseFloat(atomStr.slice(60, 66).trim());
        const hetflag = atomStr.slice(0, 6).trim() === "HETATM";

        let elem = atomStr.slice(76, 78).trim();
        if (elem === "") {
            // Get first two letters of atom name
            elem = atomStr.slice(12, 14).trim();
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
            hetflag,
        };
    }
}
