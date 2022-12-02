/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/ban-types */

import { GLModel } from "@/UI/Panels/Viewer/GLModelType";

export interface IAtom {
    chain: string;
    resi: number;
    resn: string;
    serial?: number;
    atom?: string; // atom name
    altLoc?: string;
    pdbline?: string;
    x?: number;
    y?: number;
    z?: number;
    b?: number;
    elem?: string;
    bonds?: number[];
    index?: number;
    bondOrder: number[];
}

export enum MolType {
    Protein = "protein",
    Nucleic = "nucleic",
    Compound = "compound",
    Metal = "metal",
    Lipid = "lipid",
    Ions = "ions",
    Solvent = "solvent",
}

export enum SelectedType {
    False = "false",
    True = "true",
    ChildOfTrue = "child_of_true",
}

export interface IMolContainer {
    title: string; // appears in tree
    model?: IAtom[] | GLModel; // IAtom in worker, GLMoldel in main thread
    treeExpanded: boolean;
    visible: boolean;
    selected: SelectedType; // Not bool (string enum). "false" vs. false.
    focused: boolean;
    viewerDirty: boolean; // triggers 3dmoljs viewer
    id?: string; // random id for terminal nodes
    parentId?: string; // parent id for tree
    src?: string; // typically, the file name
    nodes?: IMolContainer[]; // Next level down in menu. So if molecule,
    // then chain. If chain, then residue. Etc.
    type?: MolType;
    styles?: IStyle[]; // styles and selections for this node
    data?: { [key: string]: IMolContainerData };  // key is title
}

export enum MolContainerDataType {
    Table,
    Graph,
}

export interface IMolContainerData {
    // Varies depending on type. TODO: Make more specific using ||
    data: any;

    type: MolContainerDataType;

    // The IMolContainer that this data is associated with.
    molContainer?: IMolContainer;
}

export interface IResidue extends IMolContainer {}

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
    surface?: IColorStyle; // NOTE: Not how 3dmoljs handles surface.
}
