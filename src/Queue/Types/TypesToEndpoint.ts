// Defines API

// To send data to the queue system
export interface IToEndpointPayload {
    action: EndpointAction;
    jobInfos?: IJobInfoToEndpoint[];
    jobIds?: string[];
    jobType?: string;
    maxNumProcessors?: number;
}

// The information about how to submit a given job to the queue system
export interface IJobInfoToEndpoint {
    commandName: string;
    params: any;
    id: string;
    noResponse: boolean; // Job will run to completion silently.
    numProcessors?: number; // will default to 1
    delayRun?: number; // MS. Used for in-browser when blocking (e.g., webina)
}

export enum EndpointAction {
    // Used to get job information
    GetJobsInfo = "getJobsInfo",

    // Used to submit jobs of specified id.
    SubmitJobs = "submitJobs",

    // Used to cancel jobs of specified id.
    CancelJobs = "cancelJob",

    // Used to cancel all the jobs.
    CancelAllJobs = "cancelAllJobs",

    // Used to cancel all jobs of a given type.
    CancelAllJobsOfType = "cancelAllJobsOfType",

    // Gets the output of a job that has finished. Should also delete output
    // files from remote system.
    GetDoneJobsOutput = "getDoneJobsOutput",

    // Update the maximum number of processors that all jobs collectively can
    // use.
    UpdateMaxNumProcessors = "updateMaxProcessors",
}