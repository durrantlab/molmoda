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
    Shape = "shape",
}

export enum SelectedType {
    False = "false",
    True = "true",
    ChildOfTrue = "child_of_true",
}

export interface IMolContainer {
    // Properties common to both non-terminal and terminal nodes.
    title: string; // appears in tree
    type?: MolType;
    id?: string; // random id for nodes
    parentId?: string; // parent id for tree
    src?: string; // typically, the file name
    treeExpanded: boolean;
    visible: boolean;
    selected: SelectedType; // Not bool (string enum). "false" vs. false.
    focused: boolean;
    viewerDirty: boolean; // triggers 3dmoljs viewer
    data?: { [key: string]: IMolContainerData }; // key is title of chart, etc.

    // These are specifically for non-terminal nodes
    nodes?: IMolContainer[]; // Next level down in menu. So if molecule,

    // These are specifically for terminal nodes
    model?: IAtom[] | GLModel; // IAtom in worker, GLMoldel in main thread
    styles?: IStyle[]; // styles and selections for this node
    shape?: IShape;
}

export enum ShapeType {
    Sphere,
    Box,
    Arrow,
    Cylinder
}

export interface IShape {
    type: ShapeType;
    center: [number, number, number];
    opacity?: number;
    color?: string;
}

export interface ISphere extends IShape {
    radius: number;
}

export interface IBox extends IShape {
    // x/y/z size for box
    dimensions: [number, number, number];
}

export interface IArrow extends IShape {
    endPt: [number, number, number]; // center is start pt
    radius?: number;
    radiusRatio?: number; // Radius of arrow head is radiusRatio * radius
}

export interface ICylinder extends IShape {
    endPt: [number, number, number]; // center is start pt
    radius?: number;
    dashed?: boolean;
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
