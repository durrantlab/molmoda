// Originally, I repurposed the 3dmol.js parser for when plugins need to access
// information about atoms. But I came to realize that this is overkill. I'm now
// going to create a minimal parser for PDB and MOL2 files instead, since these
// are the formats that molmoda uses internally for protein and compound files,
// respectively. It doens't need to have a lot of functionality. It just needs
// to be light on memory.

// resn,resi,chain

import { EasyParserParent, IEasyAtom } from "./EasyParserParent";
import { IFileInfo } from "@/FileSystem/Types";

export class EasyParserPDB extends EasyParserParent {
    _load(src: IFileInfo): void {
        const atomLines = src.contents.split("\n");

        // Keep only lines that start with ATOM or HETATM
        this._atoms = atomLines.filter((line: string) => {
            return line.startsWith("ATOM") || line.startsWith("HETATM");
        });
    }

    parseAtom(idx: number): IEasyAtom {
        const atom = this._atoms[idx];

        // If it's not a string, it's already been parsed.
        if (typeof atom !== "string") {
            return atom as IEasyAtom;
        }

        // You must parse it.
        const resn = atom.slice(17, 20).trim();
        const chain = atom.slice(21, 22);
        const resi = parseInt(atom.slice(22, 26).trim());
        const x = parseFloat(atom.slice(30, 38).trim());
        const y = parseFloat(atom.slice(38, 46).trim());
        const z = parseFloat(atom.slice(46, 54).trim());

        return { resn, chain, resi, x, y, z, bondOrder: [], bonds: []};
    }

}