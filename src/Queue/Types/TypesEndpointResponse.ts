import { IFileInfo } from "@/FileSystem/Types";

export enum EndpointResponseStatus {
    Success = "success",
    Error = "error",
}

// The response from the queue system (endpoint) must be formatted like this.
export interface IEndpointResponse {
    responseStatus: EndpointResponseStatus;
    errorMsg?: string;
    jobStatuses?: IJobStatusInfo[];
}

export interface IJobStatusInfo {
    status: JobStatus;
    id: string;
    // queue time, start time, done time, depending on queue
    timestamp: number;
    numProcessors?: number;
    commandName?: string;
    outputFiles?: IFileInfo[];
}

export enum JobStatus {
    Pending = "pending",
    Running = "running",
    Done = "done",
    Error = "error",
    Incorporated = "incorporated",
    Cancelled = "cancelled",
}
