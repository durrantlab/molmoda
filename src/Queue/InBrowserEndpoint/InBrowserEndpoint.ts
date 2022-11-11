// There is a single JobManager system that submits and manages jobs, regardless
// of the endpoint (e.g., remote URL). But many jobs should just run in the
// browser, so we need an in-browser endpoint that can accept these payloads and
// respond appropriately.

import { messagesApi } from "@/Api/Messages";
import { IFileInfo } from "@/FileSystem/Types";
import { IEndpointResponse, JobStatus } from "../Types/TypesEndpointResponse";
import {
    IToEndpointPayload,
    IJobInfoToEndpoint,
} from "../Types/TypesToEndpoint";
import { processApiRequest as processApiRequest2 } from "./ProcessApiRequest";
import {
    IPausedJob,
    proceedAfterCheckPausedQueue,
    resetPausedInfo,
    startPausedQueue,
} from "./PausedQueue";
import { getJobToRun, startJob } from "./RunJob";

// This is how information about jobs is stored in the queue system internally.
// More information than needs to be sent back to the client.
export interface IJobInfoQueueEntry extends IJobInfoToEndpoint {
    status: JobStatus;
    queuedTimestamp: number;
    startedTimestamp: number;
    finishedTimestamp: number;
}

/**
 * InBrowserEndpoint
 */
export class InBrowserEndpoint {
    public pendingJobs: IJobInfoQueueEntry[] = [];
    public runningJobs: IJobInfoQueueEntry[] = [];

    // For done, error, cancelled, inorporated
    public doneJobs: IJobInfoQueueEntry[] = [];

    public maxNumProcessors = 1;

    public pausedInfo: IPausedJob;

    public fs: { [key: string]: IFileInfo[] } = {};

    /**
     * Gets a payload from the JobManager and responds appropriately (if
     * required).
     *
     * @param  {IToEndpointPayload} payload  The payload describing the action to take.
     * @returns {Promise<IEndpointResponse>}  The response to the payload.
     */
    public proecssApiRequest(
        payload: IToEndpointPayload
    ): Promise<IEndpointResponse> {
        return processApiRequest2(this, payload);
    }

    /**
     * The constructor.
     */
    constructor() {
        this.pausedInfo = resetPausedInfo();

        setInterval(() => {
            // Show spinner if job still running.
            messagesApi.waitSpinner(this.runningJobs.length > 0);

            // Check if queue is paused, and deal with that if necessary.
            // Subsequently proceed as appropriate.
            const proceed = proceedAfterCheckPausedQueue(this);
            if (!proceed) {
                return;
            }

            // Get a job to run.
            const jobToRun = getJobToRun(this);
            if (jobToRun === null) {
                // Nothing to run.
                return;
            }

            if (jobToRun.delayRun) {
                // Will start the job after a delay, allowing user to cancel.
                startPausedQueue(this, jobToRun);
                return;
            }

            // Since no need to pause queue, just start the job.
            startJob(this, jobToRun);
        }, 500);
    }


    /**
     * If jobs are not in the done queue, move them there. Regardless, change
     * their status.
     *
     * @param  {string[]}  jobIds  The job IDs to move.
     * @param  {JobStatus} status  The status to set.
     */
    public moveJobsToDoneQueue(jobIds: string[], status: JobStatus) {
        for (const jobId of jobIds) {
            let jobInWrongList = false;
            for (const jobs of [this.pendingJobs, this.runningJobs]) {
                // Is job in queuedJobs? If so, move it to done queue.
                const jobIdx = jobs.findIndex((j) => j.id === jobId);
                if (jobIdx >= 0) {
                    // Get the job, remove from original queue
                    const job = jobs.splice(jobIdx, 1)[0] as IJobInfoQueueEntry;

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
}
