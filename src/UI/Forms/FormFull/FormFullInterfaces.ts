import { ISphereOrBox } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { MoleculeInput } from "../MoleculeInputParams/MoleculeInput";

export enum FormElemType {
    Text,
    Number,
    Color,
    Select,
    Range,
    Group,
    MoleculeInputParams,
    Checkbox,
    Vector3D,
    Alert,
    SelectRegion
}

export type UserArg =
    | IUserArgText
    | IUserArgNumber
    | IUserArgSelect
    | IUserArgRange
    | IUserArgGroup
    | IUserArgMoleculeInputParams
    | IUserArgColor
    | IUserArgCheckbox
    | IUserArgVector3D
    | IUserAlert
    | IUserSelectRegion;

interface IUserArg {
    id: string;

    // `type` inferred if not given, but in some cases must specify (e.g.,
    // FormElemType.Number and FormElemType.Range both deal with numbers)
    type?: FormElemType;

    label?: string;

    validateFunc?: (val: any) => boolean;

    enabled?: boolean;

    // Description appears below in smaller font. TODO: Not implemented
    // everywhere. Just as needed.
    description?: string;
}

// Below interface just to help with typescript.
export interface IGenericUserArg extends IUserArg {
    val?: any;
    min?: any;
    options?: any;
    childElements?: any;
    placeHolder?: any;
    filterFunc?: any;
    enabled?: any;
    isMoleculeInput?: any;
    alertType?: any;
    regionName?: any;
}

export interface IUserArgText extends IUserArg {
    val: string;
    placeHolder?: string;
    filterFunc?: (val: any) => any;
}

export interface IUserArgColor extends IUserArg {
    val: string;
}
export interface IUserArgNumber extends IUserArg {
    val: number;
    placeHolder?: string;
    filterFunc?: (val: any) => any;
}

export interface IUserArgCheckbox extends IUserArg {
    val: boolean;
}

export interface IUserArgRange extends IUserArgNumber {
    min: number;
    max: number;
    step: number;
}

export interface IUserArgVector3D extends IUserArg {
    val: [number, number, number];
}

export interface IUserArgOption {
    description: string;
    val: any;
    disabled?: boolean;
}

export interface IUserArgSelect extends IUserArg {
    val: string;
    options: (string | IUserArgOption)[];
}

export interface IUserArgGroup extends IUserArg {
    // Use label as title.
    childElements: UserArg[];
    startOpened?: boolean;
}

export interface IUserArgMoleculeInputParams extends IUserArg {
    val: MoleculeInput;
}

export interface IUserAlert extends IUserArg {
    // Use description (not label!) as message.
    alertType: string;  // warning, info, etc.
    description: string;  // Required
}

export interface IUserSelectRegion extends IUserArg {
    val: ISphereOrBox | null,
    regionName?: string;
}