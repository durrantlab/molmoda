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
    datetime?: string;
    variant?: PopupVariant;
    callBack?: Function;
    neverClose?: boolean;
    open?: boolean;  // Whether to open or close
}

export interface ISimpleVideo extends ISimpleMsg {
    youtubeID: string;
}

export interface IDelayedJobPopup {
    open: boolean;  // Whether to open or close
    // message?: string;
    jobType?: string;
    jobId?: string;
    runDelayedJob?: () => {};
    cancelDelayedJob?: () => {};
    cancelAllDelayedJobsOfType?: () => {};
    cancelAllJobs?: () => {};
    waitTimePassed?: number;
    totalWaitTime?: number;
}