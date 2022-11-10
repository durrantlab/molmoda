// There is a single JobManager system that submits and manages jobs, regardless
// of the endpoint (e.g., remote URL). But many jobs should just run in the
// browser, so we need an in-browser endpoint that can accept these payloads and
// respond appropriately.

import { messagesApi } from "@/Api/Messages";
import { IFileInfo } from "@/FileSystem/Types";
import { RunJob } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    EndpointResponseStatus,
    IEndpointResponse,
    IJobStatusInfo,
    JobStatus,
} from "../Types/TypesEndpointResponse";
import { IToEndpointPayload, EndpointAction, IJobInfoToEndpoint } from "../Types/TypesToEndpoint";
import { registeredInBrowserJobFuncs } from "./RegisteredInBrowserJobFuncs";

enum Queue {
    Pending,
    Running,
    Done,
}

// This is how information about jobs is stored in the queue system internally.
// More information than needs to be sent back to the client.
interface IJobInfoQueueEntry extends IJobInfoToEndpoint {
    status: JobStatus;
    queuedTimestamp: number;
    startedTimestamp: number;
    finishedTimestamp: number;
}

/**
 * InBrowserEndpoint
 */
export class InBrowserEndpoint {
    private _pendingJobs: IJobInfoQueueEntry[] = [];
    private _runningJobs: IJobInfoQueueEntry[] = [];

    // For done, error, cancelled, inorporated
    private _doneJobs: IJobInfoQueueEntry[] = [];

    private _maxNumProcessors = 1;
    private _queueCheckerTimer: any;

    private _paused = false;
    private _pausedTimer: any;
    private _pausedTimerStart = 0;
    private _pausedWaitTime = 0;

    private _fs: { [key: string]: IFileInfo[] } = {};

    /**
     * The constructor.
     */
    constructor() {
        this._queueCheckerTimer = setInterval(() => {
            if (this._paused) {
                // Update popup message telling paused.
                const timePassed = Date.now() - this._pausedTimerStart;
                messagesApi.popupMessage(
                    "Job Start Pending",
                    "Job will start in " +
                        Math.ceil((this._pausedWaitTime - timePassed) / 1000) +
                        " seconds."
                );
                return;
            }

            // Among the jobs currently running, how many processors are in use?
            let numProcessorsInUse = 0;
            for (const job of this._runningJobs) {
                numProcessorsInUse += job.numProcessors || 1;
            }

            // How many processors are free?
            let numFreeProcessors = this._maxNumProcessors - numProcessorsInUse;

            if (numFreeProcessors <= 0) {
                // no free processors
                return;
            }

            // Show spinner if job still running.
            messagesApi.waitSpinner(this._runningJobs.length > 0);

            // Go down the queuedJobs list and move them to the running list if
            // it can fit. Repeat until no more can fit.
            for (const pendingJob of this._pendingJobs) {
                if (this._pendingJobs.length === 0) {
                    // No more queued jobs
                    break;
                }

                if (this._paused) {
                    break;
                }

                const pendJobNumProcs = pendingJob.numProcessors || 1;
                if (pendJobNumProcs > numFreeProcessors) {
                    // Job cannot fit. Try next one.
                    continue;
                }

                if (pendingJob.delayRun) {
                    messagesApi.popupMessage("Message", "Job started");
                    this._paused = true;
                    if (this._pausedTimer) {
                        clearTimeout(this._pausedTimer);
                    }
                    this._pausedTimerStart = new Date().getTime();
                    this._pausedWaitTime = pendingJob.delayRun;

                    // const intrvl = setInterval(() => {
                    //     messagesApi.popupMessage("moose", "Job started" + new Date().toISOString());
                    // }, 500);
                    this._pausedTimer = setTimeout(() => {
                        // Now done.
                        this._paused = false;
                        messagesApi.closePopupMessage();

                        // Clear delayRun so it will proceed.
                        pendingJob.delayRun = undefined;
                    }, pendingJob.delayRun);
                    return;
                }

                // Job works within limit. Run it.
                numFreeProcessors -= pendJobNumProcs;
                this._startJob(pendingJob);
            }
        }, 500);
    }

    /**
     * Gets a payload from the JobManager and responds appropriately (if
     * required).
     *
     * @param  {IToEndpointPayload} payload  The payload describing the action to take.
     * @returns {Promise<IEndpointResponse>}  The response to the payload.
     */
    public getPayload(payload: IToEndpointPayload): Promise<IEndpointResponse> {
        switch (payload.action) {
            case EndpointAction.SubmitJobs: {
                const jobInfos: IJobInfoQueueEntry[] =
                    payload.jobInfos as IJobInfoQueueEntry[];

                // Set status on all jobs to Pending
                for (const jobInfo of jobInfos) {
                    jobInfo.status = JobStatus.Pending;
                    jobInfo.queuedTimestamp = new Date().getTime();
                    jobInfo.startedTimestamp = -1;
                    jobInfo.finishedTimestamp = -1;
                }

                // Add to queuedJobs
                this._pendingJobs.push(...jobInfos);

                // Timer will start running the jobs when ready.
                break;
            }

            case EndpointAction.GetJobsInfo: {
                const jobStatuses: IJobStatusInfo[] = [
                    ...this._prepGetJobsInfoResponse(Queue.Pending),
                    ...this._prepGetJobsInfoResponse(Queue.Running),
                    ...this._prepGetJobsInfoResponse(Queue.Done),
                ];

                return Promise.resolve({
                    responseStatus: EndpointResponseStatus.Success,
                    jobStatuses: jobStatuses,
                });
            }

            case EndpointAction.CancelJobs: {
                this._moveJobsToDoneQueue(
                    payload.jobIds as string[],
                    JobStatus.Cancelled
                );
                break;
            }

            case EndpointAction.GetDoneJobsOutput: {
                // Are any of the jobs not in the done queue? If so, return an error.
                const jobIds = payload.jobIds as string[];
                for (const jobId of jobIds) {
                    const jobIdx = this._doneJobs.findIndex((j) => j.id === jobId);
                    if (jobIdx === -1) {
                        return Promise.resolve({
                            responseStatus: EndpointResponseStatus.Error,
                            errorMessage: "Job has not yet finished, so can't provide output",
                        });
                    }
                }
                
                // All jobs are in the done queue. Set their status to
                // Incorporated and put them in a separate list for processing.
                const incorporatedQueueEntries: IJobInfoQueueEntry[] = [];
                for (const jobId of jobIds) {
                    const jobIdx = this._doneJobs.findIndex((j) => j.id === jobId);
                    this._doneJobs[jobIdx].status = JobStatus.Incorporated;
                    incorporatedQueueEntries.push({
                        ...this._doneJobs[jobIdx]
                    });
                }
                
                // Convert the queue entries into a format better for responding
                // to the client.
                const statusInfos = this._prepGetJobsInfoResponse(incorporatedQueueEntries);

                // Add the output to the statusInfos and delete from _fs.
                for (const statusInfo of statusInfos) {
                    statusInfo.outputFiles = this._fs[statusInfo.id];
                    delete this._fs[statusInfo.id];
                }

                return Promise.resolve({
                    responseStatus: EndpointResponseStatus.Success,
                    jobStatuses: statusInfos,
                });
            }

            case EndpointAction.UpdateMaxNumProcessors: {
                this._maxNumProcessors = payload.maxNumProcessors as number;
                break;
            }
        }

        // No response required
        return Promise.resolve({
            responseStatus: EndpointResponseStatus.Success,
        });
    }

    /**
     * Starts a job. Moves to running queue and runs it.
     *
     * @param  {IJobInfoQueueEntry} pendingJob  The job to start.
     * @returns {Promise<any>}  A promise that resolves when the job is done.
     */
    private _startJob(pendingJob: IJobInfoQueueEntry): Promise<any> {
        // Change status
        pendingJob.status = JobStatus.Running;
        pendingJob.startedTimestamp = new Date().getTime();

        // Add to runningJobs
        this._runningJobs.push(pendingJob);

        // Remove from pendingJobs
        this._pendingJobs = this._pendingJobs.filter(
            (j) => j.id !== pendingJob.id
        );

        // Get the in-browser run func
        const inBrowserJobFunc =
            registeredInBrowserJobFuncs[pendingJob.commandName];

        // Run it.
        const response = inBrowserJobFunc(pendingJob.id, pendingJob.params);
        if (response instanceof Promise) {
            return response
                .then((files: RunJob) => {
                    // Job is done. Move it to done queue.
                    this._moveJobsToDoneQueue([pendingJob.id], JobStatus.Done);
                    this._saveOutputFiles(pendingJob.id, files);
                    return;
                })
                .catch(() => {
                    // Job is done with an error. Move it to done queue.
                    this._moveJobsToDoneQueue([pendingJob.id], JobStatus.Error);
                });
        } else {
            // Job is done. Move it to done queue. TODO: What about if error in
            // sync func? Not caught?
            this._moveJobsToDoneQueue([pendingJob.id], JobStatus.Done);
            this._saveOutputFiles(pendingJob.id, response);
            return Promise.resolve(undefined);
        }
    }

    /**
     * Save output files to the local, fake file system.
     * 
     * @param  {string} id         The job ID.
     * @param  {RunJob} fileInfos  The output files.
     */
    private _saveOutputFiles(id: string, fileInfos: RunJob) {
        if (fileInfos === undefined) {
            // Nothing to load
            return;
        }

        // Make sure array
        if (!Array.isArray(fileInfos)) {
            fileInfos = [fileInfos];
        }

        if (this._fs[id] === undefined) {
            this._fs[id] = [];
        }

        this._fs[id].push(...fileInfos);
    }

    /**
     * If jobs are not in the done queue, move them there. Regardless, change
     * their status.
     *
     * @param  {string[]}  jobIds  The job IDs to move.
     * @param  {JobStatus} status  The status to set.
     */
    private _moveJobsToDoneQueue(jobIds: string[], status: JobStatus) {
        for (const jobId of jobIds) {
            let jobInWrongList = false;
            for (const jobs of [this._pendingJobs, this._runningJobs]) {
                // Is job in queuedJobs? If so, move it to done queue.
                const jobIdx = jobs.findIndex((j) => j.id === jobId);
                if (jobIdx >= 0) {
                    // Get the job, remove from original queue
                    const job = jobs.splice(
                        jobIdx,
                        1
                    )[0] as IJobInfoQueueEntry;

                    // Change its status
                    job.status = status;
                    job.finishedTimestamp = new Date().getTime();

                    // Add to done queue
                    this._doneJobs.push(job);

                    jobInWrongList = true;
                    break;
                }
            }

            if (!jobInWrongList) {
                // It was already in the done queue, so we're good. But need to
                // change its status.
                for (const job of this._doneJobs) {
                    if (job.id === jobId) {
                        job.status = status;

                        if (job.finishedTimestamp === undefined) {
                            job.finishedTimestamp = new Date().getTime();
                        }
                        break;
                    }
                }
            }
        }
    }

    // private _debugQueueSize() {
    //     console.log(
    //         "MOO",
    //         this._pendingJobs.length,
    //         this._runningJobs.length,
    //         this._doneJobs.length
    //     );
    // }

    /**
     * For a given queue, converts each queue entry (IJobInfoEndpointResponse)
     * into an acceptable response to send back to the client (response requires
     * formatted as IJobStatusInfo).
     * 
     * @param  {Queue | IJobInfoQueueEntry[]} queue  The queue to use, or a list
     *                                               of queue entries.
     * @returns {IJobStatusInfo}  The formatted response.
     */
    private _prepGetJobsInfoResponse(queue: Queue | IJobInfoQueueEntry[]): IJobStatusInfo[] {
        const jobStatuses: IJobStatusInfo[] = [];

        let jobInfos: IJobInfoQueueEntry[] = [];

        // Is queue an array?
        if (Array.isArray(queue)) {
            // Must be IJobInfoQueueEntry[]
            jobInfos = queue;
        } else {
            if (queue === Queue.Pending) {
                jobInfos = this._pendingJobs;
            } else if (queue === Queue.Running) {
                jobInfos = this._runningJobs;
            } else if (queue === Queue.Done) {
                jobInfos = this._doneJobs;
            }
        }
            
        for (const jobInfo of jobInfos) {
            if (jobInfo.noResponse) {
                // Don't include jobs that don't want a response.
                continue;
            }

            let timestamp = 0;
            if (queue === Queue.Pending) {
                timestamp = jobInfo.queuedTimestamp;
            } else if (queue === Queue.Running) {
                timestamp = jobInfo.startedTimestamp;
            } else if (queue === Queue.Done) {
                timestamp = jobInfo.finishedTimestamp;
            }

            jobStatuses.push({
                id: jobInfo.id,
                status: jobInfo.status as JobStatus,
                numProcessors: jobInfo.numProcessors || 1,
                timestamp: timestamp,
                commandName: jobInfo.commandName,
            });
        }

        return jobStatuses;
    }
}
