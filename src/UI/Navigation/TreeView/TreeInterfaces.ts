/* eslint-disable */

interface ICommonNode {
    text: string;
    atoms?: IAtom[];
    model?: any;
    id?: string;  // random id for terminal nodes
    treeExpanded: boolean;
    viewerDirty: boolean;  // triggers 3dmoljs viewer
    visible: boolean;
    focused: boolean;
}

export interface IAtom {
    chain: string;
    resi: number;
    resn: string;
}

export interface IResidue extends ICommonNode { }

export interface IChain extends ICommonNode { 
    residues?: IResidue[];
    nodes?: IResidue[];
}

export enum MolType {
    PROTEIN = "protein",
    NUCLEIC = "nucleic",
    COMPOUND = "compound",
    METAL = "metal",
    LIPID = "lipid",
    IONS = "ions",
    SOLVENT = "solvent",
}

export interface IMolEntry extends ICommonNode {
    type?: MolType;
    styles?: IStyle[];
    chains?: IChain[];
    nodes?: IChain[];
}

export interface IFileContents extends ICommonNode {
    mols?: IMolEntry[];
    nodes?: IMolEntry[];
}

export interface IStyle {
    selection: any;
    style: any;
}
