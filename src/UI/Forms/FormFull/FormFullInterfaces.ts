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
    SelectShape
}

export type FormElement =
    | IFormText
    | IFormNumber
    | IFormSelect
    | IFormRange
    | IFormGroup
    | IFormMoleculeInputParams
    | IFormColor
    | IFormCheckbox
    | IFormVector3D
    | IFormAlert
    | IFormSelectShape;

interface IFormElement {
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
export interface IGenericFormElement extends IFormElement {
    val?: any;
    min?: any;
    options?: any;
    childElements?: any;
    placeHolder?: any;
    filterFunc?: any;
    enabled?: any;
    isMoleculeInput?: any;
    alertType?: any;
}

export interface IFormText extends IFormElement {
    val: string;
    placeHolder?: string;
    filterFunc?: (val: any) => any;
}

export interface IFormColor extends IFormElement {
    val: string;
}
export interface IFormNumber extends IFormElement {
    val: number;
    placeHolder?: string;
    filterFunc?: (val: any) => any;
}

export interface IFormCheckbox extends IFormElement {
    val: boolean;
}

export interface IFormRange extends IFormNumber {
    min: number;
    max: number;
    step: number;
}

export interface IFormVector3D extends IFormElement {
    val: [number, number, number];
}

export interface IFormOption {
    description: string;
    val: any;
    disabled?: boolean;
}

export interface IFormSelect extends IFormElement {
    val: string;
    options: (string | IFormOption)[];
}

export interface IFormGroup extends IFormElement {
    // Use label as title.
    childElements: FormElement[];
    startOpened?: boolean;
}

export interface IFormMoleculeInputParams extends IFormElement {
    val: MoleculeInput;
}

export interface IFormAlert extends IFormElement {
    // Use description (not label!) as message.
    alertType: string;  // warning, info, etc.
    description: string;  // Required
}

export interface IFormSelectShape extends IFormElement {
    val: ISphereOrBox | null
}