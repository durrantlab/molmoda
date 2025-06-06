import { ISphereOrBox } from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    IProtCmpdTreeNodePair,
    MoleculeInput,
} from "../MoleculeInputParams/MoleculeInput";
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
    SelectRegion,
    ListSelect,
}

export interface IUserArgOption {
    description: string;
    val: any;
    disabled?: boolean;
}

interface IUserArg {
    id: string;

    // Children interfaces may redefine, but all should have val.
    val: any;

    // `type` inferred if not given, but in some cases must specify (e.g.,
    // UserArgType.Number and UserArgType.Range both deal with numbers)
    type?: UserArgType;

    label?: string;

    // Action button not enabled unless this passes.
    validateFunc?: (val: any) => boolean;

    // Adds a warning text to the Description. Doesn't prevent action button.
    warningFunc?: (val: any) => string;

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
    readonly?: boolean; // Added for edit mode
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
    alertType: string; // warning, info, etc.
    val: string; // Required
}

export interface IUserSelectRegion extends IUserArg {
    val: ISphereOrBox | null;
    regionName?: string;
}

/**
 * Interface for the ListSelect user argument.
 * This allows for a text input of a list (comma or space separated)
 * and an optional dropdown to append items to that list.
 */
export interface IUserArgListSelect extends IUserArg {
    // The current value of the list, as an array of strings or numbers. */
    val: string[] | number[];
    // Specifies whether the input items are 'text' or 'number'. If 'number',
    // ranges like "1-5" are supported. */
    inputType: "text" | "number";
    // Optional array of predefined options to append from a dropdown. */
    options?: (string | IUserArgOption)[];
    // Placeholder text for the text input field. */
    placeHolder?: string;
    // Delay in ms after input before triggering change detection. */
    delayBetweenChangesDetected?: number;
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
    | IUserSelectRegion
    | IUserArgListSelect; // New type added
