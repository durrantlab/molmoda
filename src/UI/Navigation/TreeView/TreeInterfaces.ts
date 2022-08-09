/* eslint-disable @typescript-eslint/no-empty-interface */

export interface IAtom {
    chain: string;
    resi: number;
    resn: string;
    serial?: number;
    atom?: string;  // atom name
    altLoc?: string;
    pdbline?: string;
    x?: number;
    y?: number;
    z?: number;
    b?: number;
    elem?: string;
    bonds?: number[];
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

export interface ICommonNode {
    text: string;
    atoms?: IAtom[];
    model?: any;
    id?: string;  // random id for terminal nodes
    src?: string;  // usually file name
    treeExpanded: boolean;
    viewerDirty: boolean;  // triggers 3dmoljs viewer
    visible: boolean;
    focused: boolean;
}    

export interface IResidue extends ICommonNode { }

export interface IChain extends ICommonNode { 
    residues?: IResidue[];
    nodes?: IResidue[];
}

export interface IMolEntry extends ICommonNode {
    type?: MolType;
    stylesSels?: IStyleAndSel[];
    chains?: IChain[];
    nodes?: IChain[];
}

export interface IFileContents extends ICommonNode {
    type?: MolType;
    mols?: IMolEntry[];
    nodes?: IMolEntry[];
}

export interface IColorStyle {
    color?: string;
    colorscheme?: string;
    radius?: number;
}

export interface IStyle {
    sphere?: IColorStyle;
    stick?: IColorStyle;
    line?: IColorStyle;
    cartoon?: IColorStyle;
    surface?: IColorStyle;  // NOTE: Not how 3dmoljs handles surface.
}

export interface IStyleAndSel {
    selection: any;
    style: IStyle;
}
