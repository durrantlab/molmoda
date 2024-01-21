export interface IJobInfo {
    index: number;

    input: any;
    output?: any;
}

export interface IQueueCallbacks {
    onQueueDone?: (outputs: any[]) => void;
    onJobDone?: (output: any, index: number) => void;
    onError?: (jobs: any[], error: any) => void;
    onProgress?: (percent: number) => void;
}

export interface IJobStatusInfo {
    id: string;
    progress: number;
    numProcessors: number;
    startTime: number;
    endTime?: number | undefined;
    status: JobStatus;
    cancelFunc: () => void;
}


// TODO: error and cancelled not implemented
export enum JobStatus {
    Running = "running",
    Done = "done",
    Error = "error",
    Cancelled = "cancelled",
}