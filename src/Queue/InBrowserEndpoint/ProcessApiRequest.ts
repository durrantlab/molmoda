import {
    IEndpointResponse,
    JobStatus,
    IJobStatusInfo,
    EndpointResponseStatus,
} from "../Types/TypesEndpointResponse";
import { IToEndpointPayload, EndpointAction } from "../Types/TypesToEndpoint";
import { IJobInfoQueueEntry, InBrowserEndpoint } from "./InBrowserEndpoint";
import { resetPausedInfo } from "./PausedQueue";

enum Queue {
    Pending,
    Running,
    Done,
}

/**
 * Gets a payload from the JobManager and responds appropriately (if
 * required).
 *
 * @param  {InBrowserEndpoint} endpoint  The in-browser endpoint.
 * @param  {IToEndpointPayload} payload  The payload describing the action to take.
 * @returns {Promise<IEndpointResponse>}  The response to the payload.
 */
export function processApiRequest(
    endpoint: InBrowserEndpoint,
    payload: IToEndpointPayload,
): Promise<IEndpointResponse> {
    switch (payload.action) {
        case EndpointAction.SubmitJobs: {
            _submitJobs(endpoint, payload.jobInfos as IJobInfoQueueEntry[]);
            break;
        }

        case EndpointAction.GetJobsInfo: {
            return _getJobsInfo(endpoint);
        }

        case EndpointAction.CancelJobs: {
            _cancelJobs(endpoint, payload.jobIds as string[]);
            break;
        }

        case EndpointAction.CancelAllJobs: {
            _cancelAllJobs(endpoint);
            break;
        }

        case EndpointAction.CancelAllJobsOfType: {
            _cancelAllJobsOfType(endpoint, payload.jobType as string);
            break;
        }

        case EndpointAction.GetDoneJobsOutput: {
            return _getDoneJobsOutput(endpoint, payload.jobIds as string[]);
        }

        case EndpointAction.UpdateMaxNumProcessors: {
            _updateMaxNumProcessors(
                endpoint,
                payload.maxNumProcessors as number
            );
            break;
        }
    }

    // No response required
    return Promise.resolve({
        responseStatus: EndpointResponseStatus.Success,
    });
}

/**
 * Submits jobs to the endpoint.
 * 
 * @param  {InBrowserEndpoint}    endpoint  The in-browser endpoint.
 * @param  {IJobInfoQueueEntry[]} jobInfos  The jobs to submit.
 */
function _submitJobs(
    endpoint: InBrowserEndpoint,
    jobInfos: IJobInfoQueueEntry[]
) {
    // Set status on all jobs to Pending
    for (const jobInfo of jobInfos) {
        jobInfo.status = JobStatus.Pending;
        jobInfo.queuedTimestamp = new Date().getTime();
        jobInfo.startedTimestamp = -1;
        jobInfo.finishedTimestamp = -1;
    }

    // Add to queuedJobs
    endpoint.pendingJobs.push(...jobInfos);

    // Timer will start running the jobs when ready.
}

/**
 * Gets the job information about all jobs.
 *
 * @param  {InBrowserEndpoint} endpoint The in-browser endpoint.
 * @returns {Promise<IEndpointResponse>} A promise that resolves to the job
 *     information.
 */
function _getJobsInfo(endpoint: InBrowserEndpoint): Promise<IEndpointResponse> {
    const jobStatuses: IJobStatusInfo[] = [
        ..._prepGetJobsInfoResponse(endpoint, Queue.Pending),
        ..._prepGetJobsInfoResponse(endpoint, Queue.Running),
        ..._prepGetJobsInfoResponse(endpoint, Queue.Done),
    ];

    return Promise.resolve({
        responseStatus: EndpointResponseStatus.Success,
        jobStatuses: jobStatuses,
    });
}

/**
 * Cancels the specified jobs.
 * 
 * @param  {InBrowserEndpoint} endpoint  The in-browser endpoint.
 * @param  {string[]}          jobIds    The ids of the jobs to cancel.
 */
function _cancelJobs(endpoint: InBrowserEndpoint, jobIds: string[]) {
    endpoint.moveJobsToDoneQueue(jobIds, JobStatus.Cancelled);

    // If job currently in paused queue, cancel pause too.
    if (
        endpoint.pausedInfo.jobToRun !== null &&
        jobIds !== undefined &&
        jobIds.includes(endpoint.pausedInfo.jobToRun.id)
    ) {
        endpoint.pausedInfo = resetPausedInfo();
    }
}

/**
 * Cancels all jobs.
 * 
 * @param  {InBrowserEndpoint} endpoint  The in-browser endpoint.
 */
function _cancelAllJobs(endpoint: InBrowserEndpoint) {
    endpoint.pausedInfo = resetPausedInfo();
    endpoint.moveJobsToDoneQueue(
        endpoint.pendingJobs.map((j) => j.id),
        JobStatus.Cancelled
    );
    endpoint.moveJobsToDoneQueue(
        endpoint.runningJobs.map((j) => j.id),
        JobStatus.Cancelled
    );
}

/**
 * Cancels all jobs of the specified type.
 *
 * @param  {InBrowserEndpoint} endpoint  The in-browser endpoint.
 * @param  {string}            jobType   The type (commandName) of jobs to
 *                                       cancel.
 */
function _cancelAllJobsOfType(endpoint: InBrowserEndpoint, jobType: string) {
    const jobsToCancel = endpoint.pendingJobs.filter(
        (j) => j.commandName === jobType
    );
    jobsToCancel.push(
        ...endpoint.runningJobs.filter((j) => j.commandName === jobType)
    );
    const ids = jobsToCancel.map((j) => j.id);
    endpoint.proecssApiRequest({
        action: EndpointAction.CancelJobs,
        jobIds: ids,
    });
}

/**
 * Gets the output of the specified jobs in the done queue.
 *
 * @param  {InBrowserEndpoint} endpoint  The in-browser endpoint.
 * @param  {string[]}          jobIds    The ids of the jobs to get the output
 *                                       for.
 * @returns {Promise<IEndpointResponse>}  A promise that resolves to the output
 *    of the jobs.
 */
function _getDoneJobsOutput(
    endpoint: InBrowserEndpoint,
    jobIds: string[]
): Promise<IEndpointResponse> {
    // Are any of the jobs not in the done queue? If so, return an error.
    for (const jobId of jobIds) {
        const jobIdx = endpoint.doneJobs.findIndex((j) => j.id === jobId);
        if (jobIdx === -1) {
            return Promise.resolve({
                responseStatus: EndpointResponseStatus.Error,
                errorMessage:
                    "Job has not yet finished, so can't provide output",
            });
        }
    }

    // All jobs are in the done queue. Set their status to
    // Incorporated and put them in a separate list for processing.
    const incorporatedQueueEntries: IJobInfoQueueEntry[] = [];
    for (const jobId of jobIds) {
        const jobIdx = endpoint.doneJobs.findIndex((j) => j.id === jobId);
        endpoint.doneJobs[jobIdx].status = JobStatus.Incorporated;
        incorporatedQueueEntries.push({
            ...endpoint.doneJobs[jobIdx],
        });
    }

    // Convert the queue entries into a format better for responding
    // to the client.
    const statusInfos = _prepGetJobsInfoResponse(
        endpoint,
        incorporatedQueueEntries
    );

    // Add the output to the statusInfos and delete from fs.
    for (const statusInfo of statusInfos) {
        statusInfo.outputFiles = endpoint.fs[statusInfo.id];
        delete endpoint.fs[statusInfo.id];
    }

    return Promise.resolve({
        responseStatus: EndpointResponseStatus.Success,
        jobStatuses: statusInfos,
    });
}

/**
 * Updates the maximum number of processors to use across all jobs.
 *
 * @param  {InBrowserEndpoint} endpoint          The in-browser endpoint.
 * @param  {number}            maxNumProcessors  The maximum number of
 *                                               processors to use.
 */
function _updateMaxNumProcessors(
    endpoint: InBrowserEndpoint,
    maxNumProcessors: number
) {
    endpoint.maxNumProcessors = maxNumProcessors;
}

/**
 * For a given queue, converts each queue entry (IJobInfoEndpointResponse)
 * into an acceptable response to send back to the client (response requires
 * formatted as IJobStatusInfo).
 *
 * @param  {InBrowserEndpoint} endpoint          The in-browser endpoint.
 * @param  {Queue | IJobInfoQueueEntry[]} queue  The queue to use, or a list
 *                                               of queue entries.
 * @returns {IJobStatusInfo}  The formatted response.
 */
function _prepGetJobsInfoResponse(
    endpoint: InBrowserEndpoint,
    queue: Queue | IJobInfoQueueEntry[]
): IJobStatusInfo[] {
    const jobStatuses: IJobStatusInfo[] = [];

    let jobInfos: IJobInfoQueueEntry[] = [];

    // Is queue an array?
    if (Array.isArray(queue)) {
        // Must be IJobInfoQueueEntry[]
        jobInfos = queue;
    } else {
        if (queue === Queue.Pending) {
            jobInfos = endpoint.pendingJobs;
        } else if (queue === Queue.Running) {
            jobInfos = endpoint.runningJobs;
        } else if (queue === Queue.Done) {
            jobInfos = endpoint.doneJobs;
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
