/* eslint-disable @typescript-eslint/ban-types */

export enum PopupVariant {
    PRIMARY = "primary",
    SECONDARY = "secondary",
    SUCCESS = "success",
    DANGER = "danger",
    WARNING = "warning",
    INFO = "info",
    LIGHT = "light",
    DARK = "dark",
}

export interface ISimpleMsg {
    title: string;
    message: string;
    variant?: PopupVariant;
    callBack?: Function;
}
