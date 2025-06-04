/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/ban-types */

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
    hetflag?: boolean;
}

export enum TreeNodeType {
    Protein = "protein",
    Nucleic = "nucleic",
    Compound = "compound",
    Metal = "metal",
    Lipid = "lipid",
    Ions = "ions",
    Solvent = "solvent",
    Region = "region",
    Other = "other"  // For things like fpocket volume atoms
}

export enum SelectedType {
    False = "false",
    True = "true",
    ChildOfTrue = "child_of_true",
}


export enum RegionType {
    Sphere = "Sphere",
    Box = "Box",
    Arrow = "Arrow",
    Cylinder = "Cylinder",
}


// export class Region {
//     // All regions can have these properties
//     type: RegionType;
//     center: [number, number, number];
//     opacity?: number;
//     color?: string;
//     movable?: boolean; // Whether you can move or resize

//     // Spheres and arrows have radius
//     radius?: number;

//     // x/y/z size for box
//     dimensions?: [number, number, number];

//     // arrow only (uses radius too). Also cylinder.
//     endPt?: [number, number, number]; // center is start pt
//     radiusRatio?: number; // Radius of arrow head is radiusRatio * radius

//     // Cylinder only
//     dashed?: boolean;

//     constructor(params: IRegion | ISphere | IBox | IArrow | ICylinder) {
//         this.type = params.type;
//         this.center = params.center;
//         this.opacity = params.opacity;
//         this.color = params.color;
//         this.movable = params.movable;
//         this.radius = (params as ISphere).radius;
//         this.dimensions = (params as IBox).dimensions;
//         this.endPt = (params as IArrow).endPt;
//         this.radiusRatio = (params as IArrow).radiusRatio;
//         this.dashed = (params as ICylinder).dashed;
//     }
// }

export interface IRegion {
    type: RegionType;
    center: [number, number, number];
    opacity?: number;
    color?: string;
    movable?: boolean; // Whether you can move or resize
}

export interface ISphere extends IRegion {
    radius: number;
}

export interface IBox extends IRegion {
    // x/y/z size for box
    dimensions: [number, number, number];
}

export interface IArrow extends IRegion {
    endPt: [number, number, number]; // center is start pt
    radius?: number;
    radiusRatio?: number; // Radius of arrow head is radiusRatio * radius
}

export interface ICylinder extends IRegion {
    endPt: [number, number, number]; // center is start pt
    radius?: number;
    dashed?: boolean;
}



export enum TreeNodeDataType {
    Table,
    Graph,
}

export enum TableHeaderSort {
    All,  // default
    AllButFirst,
    None
}

export interface ITreeNodeData {
    // Varies depending on type. TODO: Make more specific using ||
    data: any;  // Should be like {}, I think.

    type: TreeNodeDataType;

    // The TreeNode that this data is associated with. It's the id to avoid
    // circular references when serializing.
    treeNodeId?: string;

    headerSort?: TableHeaderSort;
}

// export interface IResidue extends TreeNode {}

// Below is used by the FormSelectRegion component in its emits.
export interface ISphereOrBox {
    center: [number, number, number];
    radius?: number;
    dimensions?: [number, number, number];
}