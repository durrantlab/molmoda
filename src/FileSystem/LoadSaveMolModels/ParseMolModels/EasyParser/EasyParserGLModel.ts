// Originally, I repurposed the 3dmol.js parser for when plugins need to access
// information about atoms. But I came to realize that this is overkill. I'm now
// going to create a minimal parser for PDB and MOL2 files instead, since these
// are the formats that molmoda uses internally for protein and compound files,
// respectively. It doens't need to have a lot of functionality. It just needs
// to be light on memory.

import { GLModel } from "@/UI/Panels/Viewer/GLModelType";
import { EasyParserParent } from "./EasyParserParent";
import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";

// This is here for backwards compatibility (in case loading old molmoda file).

/**
 * A parser for GLModel.
 */
export class EasyParserGLModel extends EasyParserParent {
    /**
     * Load the source.
     *
     * @param {GLModel} src  The source to parse.
     */
    _load(src: GLModel): void {
        this._atoms = src.selectedAtoms({}) as IAtom[];
    }

    /**
     * Parse an atom.
     *
     * @param {number} idx The index of the atom.
     * @returns {IAtom} The parsed atom.
     */
    parseAtom(idx: number): IAtom {
        return this._atoms[idx] as IAtom;
    }
}
