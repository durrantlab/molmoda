import { IStyle, TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";

export interface IStyleForMolType {
    style: IStyle;
    molType: TreeNodeType;
}

export enum RepresentationType {
    AtomsHidden = "atoms-hidden",
    BackboneHidden = "backbone-hidden",
    SurfaceHidden = "surface-hidden",
    Line = "line",
    Stick = "stick",
    Sphere = "sphere",
    Cartoon = "cartoon",
    Surface = "surface",
}