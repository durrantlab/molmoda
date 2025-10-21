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

export interface IToastOptions {
    /**
     * The duration in milliseconds for the toast to be visible. If 0 or less, the
     * toast will not automatically hide. If undefined, it will use the default
     * auto-hide duration.
     */
    duration?: number;
    showCloseBtn?: boolean;
}

export interface ISimpleMsg {
    title: string;
    message: string;
    datetime?: string;
    variant?: PopupVariant;
    // eslint-disable-next-line @typescript-eslint/ban-types
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
    downloadFilenameBase?: string;
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
    showDownloadButtons?: boolean;
    maxHeight?: number;
    alertMessage?: string;
}
