/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/ban-types */

import { TreeNode } from "../../../TreeNodes/TreeNode/TreeNode";

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


export enum ShapeType {
    Sphere = "Sphere",
    Box = "Box",
    Arrow = "Arrow",
    Cylinder = "Cylinder",
}

export interface IShape {
    type: ShapeType;
    center: [number, number, number];
    opacity?: number;
    color?: string;
    movable?: boolean; // Whether you can move or resize
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

export enum TreeNodeDataType {
    Table,
    Graph,
}

export interface ITreeNodeData {
    // Varies depending on type. TODO: Make more specific using ||
    data: any;

    type: TreeNodeDataType;

    // The TreeNode that this data is associated with.
    treeNode?: TreeNode;
}

// export interface IResidue extends TreeNode {}

export interface IColorStyle {
    color?: string;
    colorscheme?: string;
    radius?: number;
    opacity?: number;  // Only for surfaces. Not user editable.
}

export interface IStyle {
    sphere?: IColorStyle;
    stick?: IColorStyle;
    line?: IColorStyle;
    cartoon?: IColorStyle;
    surface?: IColorStyle; // NOTE: Not how 3dmoljs handles surface.
}
