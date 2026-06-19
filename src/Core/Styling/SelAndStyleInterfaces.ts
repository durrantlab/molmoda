import { IColorScheme } from "./Colors/ColorInterfaces";

/**
 * Master switch for the "lines" atom representation. Lines are disabled in
 * favor of sticks, but the supporting code (style handling, backward-compat
 * detection of existing line styles) is retained so the option can be
 * re-enabled by flipping this flag to true.
 */
export const ALLOW_LINES_REP = false;

export enum HydrogenDisplayType {
 All = "all",
 Polar = "polar",
 None = "none",
}

export interface ISelAndStyle {
    selection?: any;
    sphere?: IColorScheme;
    stick?: IColorScheme;
    line?: IColorScheme;
    cartoon?: IColorScheme;
    surface?: IColorScheme; // NOTE: Not how 3dmoljs handles surface.
    moleculeId?: string;
 hydrogens?: HydrogenDisplayType;
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
