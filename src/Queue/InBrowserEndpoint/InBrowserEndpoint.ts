// There is a single JobManager system that submits and manages jobs, regardless
// of the endpoint (e.g., remote URL). But many jobs should just run in the
// browser, so we need an in-browser endpoint that can accept these payloads and
// respond appropriately.

import { messagesApi } from "@/Api/Messages";
import {
    EndpointResponseStatus,
    IEndpointResponse,
    IJobInfoEndpointResponse,
    IJobStatusInfo,
    JobStatus,
} from "../Types/TypesEndpointResponse";
import { IToEndpointPayload, EndpointAction } from "../Types/TypesToEndpoint";
import { registeredInBrowserJobFuncs } from "./RegisteredInBrowserJobFuncs";

enum Queue {
    Pending,
    Running,
    Done,
}

/**
 * InBrowserEndpoint
 */
export class InBrowserEndpoint {
    private pendingJobs: IJobInfoEndpointResponse[] = [];
    private runningJobs: IJobInfoEndpointResponse[] = [];

    // For done, error, cancelled, inorporated
    private doneJobs: IJobInfoEndpointResponse[] = [];

    maxNumProcessors = 1;
    queueCheckerTimer: any;

    paused = false;
    pausedTimer: any;
    pausedTimerStart = 0;

    /**
     * The constructor.
     */
    constructor() {
        this.queueCheckerTimer = setInterval(() => {
            if (this.paused) {
                // Update popup message telling paused.
                const timePassed = Date.now() - this.pausedTimerStart;
                messagesApi.popupMessage(
                    "Job Start Pending",
                    "Job will start in " +
                        Math.ceil(timePassed / 1000) +
                        " seconds."
                );
                return;
            }

            // Among the jobs currently running, how many processors are
            // in use?
            let numProcessorsInUse = 0;
            for (const job of this.runningJobs) {
                numProcessorsInUse += job.numProcessors || 1;
            }

            // How many processors are free?
            let numFreeProcessors = this.maxNumProcessors - numProcessorsInUse;

            if (numFreeProcessors <= 0) {
                // no free processors
                return;
            }

            // Show spinner if job still running.
            messagesApi.waitSpinner(this.runningJobs.length > 0);

            // Go down the queuedJobs list and move them to the running list if
            // it can fit. Repeat until no more can fit.
            for (const pendingJob of this.pendingJobs) {
                if (this.pendingJobs.length === 0) {
                    // No more queued jobs
                    break;
                }

                if (this.paused) {
                    break;
                }

                const pendJobNumProcs = pendingJob.numProcessors || 1;
                if (pendJobNumProcs > numFreeProcessors) {
                    // Job cannot fit. Try next one.
                    continue;
                }

                if (pendingJob.delayRun) {
                    messagesApi.popupMessage("moose", "Job started");
                    this.paused = true;
                    if (this.pausedTimer) {
                        clearTimeout(this.pausedTimer);
                    }
                    this.pausedTimerStart = new Date().getTime();

                    // const intrvl = setInterval(() => {
                    //     messagesApi.popupMessage("moose", "Job started" + new Date().toISOString());
                    // }, 500);
                    this.pausedTimer = setTimeout(() => {
                        // Now done.
                        this.paused = false;
                        messagesApi.closePopupMessage();

                        // Clear delayRun so it will proceed.
                        pendingJob.delayRun = undefined;
                    }, pendingJob.delayRun);
                    return;
                }

                // Job works within limit. Run it.
                numFreeProcessors -= pendJobNumProcs;
                this.startJob(pendingJob);
            }
        }, 500);
    }

    /**
     * Starts a job. Moves to running queue and runs it.
     *
     * @param  {IJobInfoEndpointResponse} pendingJob  The job to start.
     * @returns {Promise<any>}  A promise that resolves when the job is done.
     */
    private startJob(pendingJob: IJobInfoEndpointResponse): Promise<any> {
        // Change status
        pendingJob.status = JobStatus.Running;
        pendingJob.startedTimestamp = new Date().getTime();

        // Add to runningJobs
        this.runningJobs.push(pendingJob);

        // Remove from pendingJobs
        this.pendingJobs = this.pendingJobs.filter(
            (j) => j.id !== pendingJob.id
        );

        // Get the in-browser run func
        const inBrowserJobFunc =
            registeredInBrowserJobFuncs[pendingJob.commandName];

        // Run it.
        const response = inBrowserJobFunc(pendingJob.id, pendingJob.params);
        if (response instanceof Promise) {
            return response
                .then(() => {
                    // Job is done. Move it to done queue.
                    this.moveJobsToDoneQueue([pendingJob.id], JobStatus.Done);
                    // TODO: Something more here?
                    return;
                })
                .catch(() => {
                    // Job is done with an error. Move it to done queue.
                    this.moveJobsToDoneQueue([pendingJob.id], JobStatus.Error);
                });
        } else {
            // Job is done. Move it to done queue. TODO: What about if error in
            // sync func? Not caught?
            this.moveJobsToDoneQueue([pendingJob.id], JobStatus.Done);
            return Promise.resolve(undefined);
        }
    }

    /**
     * If jobs are not in the done queue, move them there. Regardless, change
     * their status.
     *
     * @param  {string[]}  jobIds  The job IDs to move.
     * @param  {JobStatus} status  The status to set.
     */
    private moveJobsToDoneQueue(jobIds: string[], status: JobStatus) {
        for (const jobId of jobIds) {
            let jobInWrongList = false;
            for (const jobs of [this.pendingJobs, this.runningJobs]) {
                // Is job in queuedJobs? If so, move it to done queue.
                const jobIdx = jobs.findIndex((j) => j.id === jobId);
                if (jobIdx >= 0) {
                    // Get the job, remove from original queue
                    const job = jobs.splice(
                        jobIdx,
                        1
                    )[0] as IJobInfoEndpointResponse;

                    // Change its status
                    job.status = status;
                    job.finishedTimestamp = new Date().getTime();

                    // Add to done queue
                    this.doneJobs.push(job);

                    jobInWrongList = true;
                    break;
                }
            }

            if (!jobInWrongList) {
                // It was already in the done queue, so we're good. But need to
                // change its status.
                for (const job of this.doneJobs) {
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

    private debugQueueSize() {
        console.log(
            "MOO",
            this.pendingJobs.length,
            this.runningJobs.length,
            this.doneJobs.length
        );
    }

    private prepGetJobsInfoResponse(queue: Queue): IJobStatusInfo[] {
        const jobStatuses: IJobStatusInfo[] = [];
        let jobInfos: IJobInfoEndpointResponse[] = [];
        if (queue === Queue.Pending) {
            jobInfos = this.pendingJobs;
        } else if (queue === Queue.Running) {
            jobInfos = this.runningJobs;
        } else if (queue === Queue.Done) {
            jobInfos = this.doneJobs;
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
                const jobInfos: IJobInfoEndpointResponse[] =
                    payload.jobInfos as IJobInfoEndpointResponse[];

                // Set status on all jobs to Pending
                for (const jobInfo of jobInfos) {
                    jobInfo.status = JobStatus.Pending;
                    jobInfo.queuedTimestamp = new Date().getTime();
                    jobInfo.startedTimestamp = -1;
                    jobInfo.finishedTimestamp = -1;
                }

                // Add to queuedJobs
                this.pendingJobs.push(...jobInfos);

                // Timer will start running the jobs when ready.
                break;
            }

            case EndpointAction.GetJobsInfo: {
                const jobStatuses: IJobStatusInfo[] = [
                    ...this.prepGetJobsInfoResponse(Queue.Pending),
                    ...this.prepGetJobsInfoResponse(Queue.Running),
                    ...this.prepGetJobsInfoResponse(Queue.Done),
                ];

                return Promise.resolve({
                    responseStatus: EndpointResponseStatus.Success,
                    jobStatuses: jobStatuses,
                });
            }

            case EndpointAction.CancelJobs: {
                this.moveJobsToDoneQueue(
                    payload.jobIds as string[],
                    JobStatus.Cancelled
                );
                break;
            }

            case EndpointAction.UpdateJobIncorporated: {
                this.moveJobsToDoneQueue(
                    payload.jobIds as string[],
                    JobStatus.Incorporated
                );
                break;
            }

            case EndpointAction.UpdateMaxNumProcessors: {
                this.maxNumProcessors = payload.maxNumProcessors as number;
                break;
            }
        }

        // No response required
        return Promise.resolve({
            responseStatus: EndpointResponseStatus.Success,
        });
    }
}
