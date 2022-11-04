import { IJobInfoToEndpoint } from "./TypesToEndpoint";

export enum EndpointResponseStatus {
    Success = "success",
    Error = "error",
}

// The response from the queue system.
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
}

export enum JobStatus {
    Pending = "pending",
    Running = "running",
    Done = "done",
    Error = "error",
    Incorporated = "incorporated",
    Cancelled = "cancelled",
}

// The information about how to submit a given job to the queue system
export interface IJobInfoEndpointResponse extends IJobInfoToEndpoint {
    status: JobStatus;
    queuedTimestamp: number;
    startedTimestamp: number;
    finishedTimestamp: number;
}