// Defines API

// To send data to the queue system
export interface IApiPayload {
    action: PayloadAction;
    jobInfos?: IJobInfo[];
    jobIds?: string[];
    maxNumProcessors?: number;
}

// The information about how to submit a given job to the queue system
export interface IJobInfo {
    commandName: string;
    params: any;
    id: string;
    numProcessors?: number;  // will default to 1
    delayAfterRun?: number; // MS
    status?: JobStatus;
}

// The response from the queue system.
export interface IApiResponse {
    responseStatus: ResponseStatus;
    errorMsg?: string;
    jobStatuses?: IJobStatusInfo[];
}

export interface IJobStatusInfo {
    status: JobStatus,
    id: string,
    numProcessors?: number;
}

export enum ResponseStatus {
    Success = "success",
    Error = "error",
}

export enum JobStatus {
    Pending = "pending",
    Running = "running",
    Done = "done",
    Error = "error",
    Incorporated = "incorporated",
    Cancelled = "cancelled",
}

export enum PayloadAction {
    // Used to get job information
    GetJobsInfo = "getJobsInfo",

    // Used to submit jobs
    SubmitJobs = "submitJobs",

    // Used to cancel jobs
    CancelJobs = "cancelJob",

    // Used to update job status (e.g., to inform incorporated so can be deleted
    // remotely)
    UpdateJobIncorporated = "updateJobIncorporated",

    // Update the maximum number of processors that all jobs collectively can
    // use.
    UpdateMaxNumProcessors = "updateMaxProcessors",
}
