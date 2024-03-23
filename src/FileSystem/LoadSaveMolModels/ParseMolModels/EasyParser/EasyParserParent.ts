// Originally, I repurposed the 3dmol.js parser for when plugins need to access
// information about atoms. But I came to realize that this is overkill. I'm now
// going to create a minimal parser for PDB and MOL2 files instead, since these
// are the formats that molmoda uses internally for protein and compound files,
// respectively. It doens't need to have a lot of functionality. It just needs
// to be light on memory.

import { IFileInfo } from "@/FileSystem/Types";
import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { GLModel } from "@/UI/Panels/Viewer/GLModelType";

export interface IEasyAtom {
    // serial: number;
    // atom: string;
    // elem: string;
    // altLoc: string;
    resn: string;
    chain: string;
    resi: number;
    bondOrder: number[]; // I don't think it's ever used.
    bonds: number[]; // I don't think it's ever used.
    x: number;
    y: number;
    z: number;
    // b: number;
}

export abstract class EasyParserParent {
    constructor(src: IFileInfo | GLModel | IAtom[]) {
        this._load(src);
    }
    protected _atoms: (string | IEasyAtom)[] = [];
    abstract _load(src: IFileInfo | GLModel | IAtom[]): void;
    abstract parseAtom(idx: number): IEasyAtom;
    get length(): number {
        return this._atoms.length;
    }

    get atoms(): IEasyAtom[] {
        return this._atoms.map((atom, idx) => {
            return this.parseAtom(idx);
        });
    }
}
