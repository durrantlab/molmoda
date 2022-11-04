// Defines API

// To send data to the queue system
export interface IToEndpointPayload {
    action: EndpointAction;
    jobInfos?: IJobInfoToEndpoint[];
    jobIds?: string[];
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
