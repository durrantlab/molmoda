/* eslint-disable @typescript-eslint/ban-types */

import { ITableData } from "@/UI/Components/Table/Types";

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
    datetime?: string;
    variant?: PopupVariant;
    callBack?: Function;
    neverClose?: boolean;
    open?: boolean; // Whether to open or close
}

export interface ITableDataMsg {
    title: string;
    message: string;
    tableData: ITableData;
    caption: string;
    precision?: number;
    open?: boolean; // Whether to open or close
}

export enum YesNo {
    Yes,
    No,
  Cancel,
}

export interface IYesNoMsg {
    message: string;
    callBack: (val: YesNo) => void;
    title?: string;
    yesBtnTxt?: string;
    noBtnTxt?: string;
    showCancelBtn?: boolean;
}

export interface ISimpleVideo extends ISimpleMsg {
    youtubeID: string;
}

export interface ISimpleSvg extends ISimpleMsg {
    svgContents: string;
  filenameBase?: string; // For specifying download filenames
}