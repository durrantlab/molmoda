import { ISphereOrBox } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { IProtCmpdTreeNodePair, MoleculeInput } from "../MoleculeInputParams/MoleculeInput";
import { FileInfo } from "@/FileSystem/FileInfo";

export enum UserArgType {
    Text,
    TextArea,
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
    | IUserArgTextArea
    | IUserArgGroup
    | IUserArgMoleculeInputParams
    | IUserArgColor
    | IUserArgCheckbox
    | IUserArgVector3D
    | IUserArgAlert
    | IUserSelectRegion;

interface IUserArg {
    id: string;

    // Children interfaces may redefine, but all should have val.
    val: any;

    // `type` inferred if not given, but in some cases must specify (e.g.,
    // UserArgType.Number and UserArgType.Range both deal with numbers)
    type?: UserArgType;

    label?: string;

    validateFunc?: (val: any) => boolean;

    enabled?: boolean;

    // Description appears below in smaller font. TODO: Not implemented
    // everywhere. Just as needed.
    description?: string;
}

export interface IUserArgText extends IUserArg {
    val: string;
    placeHolder?: string;
    delayBetweenChangesDetected?: number;
    filterFunc?: (val: any) => any;
}

export interface IUserArgTextArea extends IUserArg {
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
    val: UserArg[];
    startOpened?: boolean;
}

export interface IUserArgMoleculeInputParams extends IUserArg {
    val: MoleculeInput | FileInfo[] | IProtCmpdTreeNodePair[];
}

export interface IUserArgAlert extends IUserArg {
    // Use val (not label!) as message.
    alertType: string;  // warning, info, etc.
    val: string;  // Required
}

export interface IUserSelectRegion extends IUserArg {
    val: ISphereOrBox | null,
    regionName?: string;
}