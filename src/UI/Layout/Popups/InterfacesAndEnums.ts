/* eslint-disable @typescript-eslint/ban-types */

export enum PopupVariant {
    Primary = "primary",
    Secondary = "secondary",
    Success = "success",
    Danger = "danger",
    Warning = "warning",
    Info = "info",
    Light = "light",
    Dark = "dark",
}

export interface ISimpleMsg {
    title: string;
    message: string;
    variant?: PopupVariant;
    callBack?: Function;
    neverClose?: boolean;
}
