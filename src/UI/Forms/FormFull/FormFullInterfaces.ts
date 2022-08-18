export enum FormElemType {
    Text,
    Number,
    Color,
    Select,
    Range,
    Group,
}

export type FormElement =
    | IFormTextOrColor
    | IFormNumber
    | IFormSelect
    | IFormRange
    | IFormGroup;

export interface IFormElement {
    id: string;
    type: FormElemType;
    label?: string;
}

export interface IFormTextOrColor extends IFormElement {
    val: string;
}

export interface IFormNumber extends IFormElement {
    val: number;
}

export interface IFormRange extends IFormNumber {
    min: number;
    max: number;
    step: number;
}

export interface IFormSelect extends IFormElement {
    val: string;
    options: string[];
}

export interface IFormGroup extends IFormElement {
    // Use label as title.
    childElements: FormElement[]
    startOpened?: boolean;
}
