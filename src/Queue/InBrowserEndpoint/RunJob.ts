import { RunJob } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { JobStatus } from "../Types/TypesEndpointResponse";
import { InBrowserEndpoint, IJobInfoQueueEntry } from "./InBrowserEndpoint";
import { registeredInBrowserJobFuncs } from "./RegisteredInBrowserJobFuncs";

/**
 * Gets the next job to run, subject to constraints.
 * 
 * @param  {InBrowserEndpoint} endpoint The in-browser endpoint.
 * @returns {IJobInfoQueueEntry | null} . The next job to run, or null if none.
 */
export function getJobToRun(
    endpoint: InBrowserEndpoint
): IJobInfoQueueEntry | null {
    if (endpoint.pendingJobs.length === 0) {
        // No more queued jobs to run.
        return null;
    }

    if (endpoint.pausedInfo.isPaused) {
        // Queue is currently paused (e.g., waiting for user to click
        // "continue" button on some job with a delay).
        return null;
    }

    // Among the jobs currently running, how many processors are in use?
    let numProcessorsInUse = 0;
    for (const job of endpoint.runningJobs) {
        numProcessorsInUse += job.numProcessors || 1;
    }

    // How many processors are free?
    const numFreeProcessors = endpoint.maxNumProcessors - numProcessorsInUse;
    if (numFreeProcessors <= 0) {
        // no free processors
        return null;
    }

    // Go down the queuedJobs list until you find a job that fits. Pick the
    // first job. endpoint fires frequently, so subsequent jobs that might also
    // fit will be added shortly.
    for (const pendingJob of endpoint.pendingJobs) {
        const numProcesRequired = pendingJob.numProcessors || 1;
        if (numProcesRequired > numFreeProcessors) {
            // Job cannot fit. Try next one.
            continue;
        }

        // Job can fit, so return it.
        return pendingJob;
    }

    // No job found that fits.
    return null;
}

/**
 * Starts a job. Moves to running queue and runs it.
 *
 * @param  {InBrowserEndpoint} endpoint  The in-browser endpoint.
 * @param  {IJobInfoQueueEntry} pendingJob  The job to start.
 * @returns {Promise<any>}  A promise that resolves when the job is done.
 */
export function startJob(
    endpoint: InBrowserEndpoint,
    pendingJob: IJobInfoQueueEntry
): Promise<any> {
    // Change status
    pendingJob.status = JobStatus.Running;
    pendingJob.startedTimestamp = new Date().getTime();

    // Add to runningJobs
    endpoint.runningJobs.push(pendingJob);

    // Remove from pendingJobs
    endpoint.pendingJobs = endpoint.pendingJobs.filter(
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
                endpoint.moveJobsToDoneQueue([pendingJob.id], JobStatus.Done);
                _saveOutputFiles(endpoint, pendingJob.id, files);
                return;
            })
            .catch(() => {
                // Job is done with an error. Move it to done queue.
                endpoint.moveJobsToDoneQueue([pendingJob.id], JobStatus.Error);
            });
    } else {
        // Job is done. Move it to done queue. TODO: What about if error in
        // sync func? Not caught?
        endpoint.moveJobsToDoneQueue([pendingJob.id], JobStatus.Done);
        _saveOutputFiles(endpoint, pendingJob.id, response);
        return Promise.resolve(undefined);
    }
}

/**
 * Save output files to the local, fake file system.
 *
 * @param  {InBrowserEndpoint} endpoint  The in-browser endpoint.
 * @param  {string} id         The job ID.
 * @param  {RunJob} fileInfos  The output files.
 */
function _saveOutputFiles(endpoint: InBrowserEndpoint, id: string, fileInfos: RunJob) {
    if (fileInfos === undefined) {
        // Nothing to load
        return;
    }

    // Make sure array
    if (!Array.isArray(fileInfos)) {
        fileInfos = [fileInfos];
    }

    if (endpoint.fs[id] === undefined) {
        endpoint.fs[id] = [];
    }

    endpoint.fs[id].push(...fileInfos);
}
