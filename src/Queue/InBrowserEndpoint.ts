// There is a single JobManager system that submits and manages jobs, regardless
// of the endpoint (e.g., remote URL). But many jobs should just run in the
// browser, so we need an in-browser endpoint that can accept these payloads and
// respond appropriately.

import { messagesApi } from "@/Api/Messages";
import {
    IApiPayload,
    IApiResponse,
    IJobInfo,
    IJobStatusInfo,
    JobStatus,
    PayloadAction,
    ResponseStatus,
} from "./Definitions";
import { registeredInBrowserJobFuncs } from "./JobQueue";

/**
 * InBrowserEndpoint
 */
export class InBrowserEndpoint {
    private pendingJobs: IJobInfo[] = [];
    private runningJobs: IJobInfo[] = [];
    
    // For done, error, cancelled, inorporated
    private doneJobs: IJobInfo[] = [];

    maxNumProcessors = 1;
    queueCheckerTimer: any;

    /**
     * The constructor.
     */
    constructor() {
        this.queueCheckerTimer = setInterval(() => {
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
                const pendJobNumProcs = pendingJob.numProcessors || 1;
                if (pendJobNumProcs > numFreeProcessors) {
                        // Job cannot fit. Try next one.
                        continue;
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
     * @param  {IJobInfo} pendingJob  The job to start.
     */
    private startJob(pendingJob: IJobInfo) {
        // Change status
        pendingJob.status = JobStatus.Running;

        // Add to runningJobs
        this.runningJobs.push(pendingJob);
        
        // Remove from pendingJobs
        this.pendingJobs = this.pendingJobs.filter((j) => j.id !== pendingJob.id);

        // Get the in-browser run func
        const inBrowserJobFunc = registeredInBrowserJobFuncs[pendingJob.commandName];

        // Run it.
        const response = inBrowserJobFunc(pendingJob.id, pendingJob.params);
        if (response instanceof Promise) {
            response.then(() => {
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
                    // Get the job
                    const job = jobs.splice(jobIdx, 1)[0] as IJobInfo;

                    // Remove from the original queue
                    jobs.splice(jobIdx, 1);

                    // Change its status
                    job.status = status;

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
                        job.status = JobStatus.Incorporated;
                        break;
                    }
                }
            }
        }
    }

    /**
     * Gets a payload from the JobManager and responds appropriately (if
     * required).
     *
     * @param  {IApiPayload} payload  The payload describing the action to take.
     * @returns {IApiResponse | void}  The response to the payload, if required.
     */
    public getPayload(payload: IApiPayload): IApiResponse | void {
        switch (payload.action) {
            case PayloadAction.SubmitJobs: {
                const jobInfos: IJobInfo[] = payload.jobInfos as IJobInfo[];

                // Set status on all jobs to Pending
                for (const jobInfo of jobInfos) {
                    jobInfo.status = JobStatus.Pending;
                }

                // Add to queuedJobs
                this.pendingJobs.push(...jobInfos);

                // Timer will start running the jobs when ready.
                break;
            }

            case PayloadAction.GetJobsInfo: {
                const jobStatuses: IJobStatusInfo[] = [];
                for (const job of [
                    ...this.pendingJobs,
                    ...this.runningJobs,
                    ...this.doneJobs,
                ]) {
                    jobStatuses.push({
                        id: job.id,
                        status: job.status as JobStatus,
                        numProcessors: job.numProcessors || 1,
                    });
                }

                return {
                    responseStatus: ResponseStatus.Success,
                    jobStatuses: jobStatuses,
                };
            }

            case PayloadAction.CancelJobs: {
                this.moveJobsToDoneQueue(
                    payload.jobIds as string[],
                    JobStatus.Cancelled
                );
                break;
            }

            case PayloadAction.UpdateJobIncorporated: {
                this.moveJobsToDoneQueue(
                    payload.jobIds as string[],
                    JobStatus.Incorporated
                );
                break;
            }

            case PayloadAction.UpdateMaxNumProcessors: {
                this.maxNumProcessors = payload.maxNumProcessors as number;
                break;
            }
        }
    }
}
