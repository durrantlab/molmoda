// Originally, I repurposed the 3dmol.js parser for when plugins need to access
// information about atoms. But I came to realize that this is overkill. I'm now
// going to create a minimal parser for PDB and MOL2 files instead, since these
// are the formats that molmoda uses internally for protein and compound files,
// respectively. It doens't need to have a lot of functionality. It just needs
// to be light on memory.

import { GLModel } from "@/UI/Panels/Viewer/GLModelType";
import { EasyParserParent, IEasyAtom } from "./EasyParserParent";

// This is here for backwards compatibility (in case loading old molmoda file).

export class EasyParserGLModel extends EasyParserParent {
    _load(glModel: GLModel): void {
        this._atoms = glModel.selectedAtoms({}) as IEasyAtom[];
    }

    parseAtom(idx: number): IEasyAtom {
        return this._atoms[idx] as IEasyAtom;
    }
}