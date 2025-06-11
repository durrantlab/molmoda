import { IColorScheme } from "./Colors/ColorInterfaces";

export interface ISelAndStyle {
    selection?: any;
    sphere?: IColorScheme;
    stick?: IColorScheme;
    line?: IColorScheme;
    cartoon?: IColorScheme;
    surface?: IColorScheme; // NOTE: Not how 3dmoljs handles surface.
    moleculeId?: string;
}

export enum AtomsRepresentation {
    Hidden = "atoms-hidden",
    Line = "line",
    Stick = "stick",
    Sphere = "sphere",
}

export enum BackBoneRepresentation {
    Hidden = "backbone-hidden",
    Cartoon = "cartoon",
}

export enum SurfaceRepresentation {
    Hidden = "surface-hidden",
    Surface = "surface",
}

export type Representation =
    | AtomsRepresentation
    | BackBoneRepresentation
    | SurfaceRepresentation;
