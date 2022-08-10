/* eslint-disable @typescript-eslint/no-empty-interface */

export interface GLModel { }
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

export interface IMolContainer {
    title: string;                // appears in tree
    model?: IAtom[] | GLModel;    // IAtom in worker, GLMoldel in main thread
    id?: string;                  // random id for terminal nodes
    parentId?: string;            // parent id for tree
    src?: string;                 // usually file name
    nodes?: IMolContainer[];      // Next level down in menu. So if molecule,
                                  // then chain. If chain, then residue. Etc.
    type?: MolType;
    treeExpanded: boolean;
    visible: boolean;
    focused: boolean;
    viewerDirty: boolean;         // triggers 3dmoljs viewer
    stylesSels?: IStyleAndSel[];  // styles and selections for this node
}

export interface IResidue extends IMolContainer { }

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
