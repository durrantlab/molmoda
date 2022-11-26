import { pluginsApi } from "@/Api/Plugins";
import { IDelayedJobPopup } from "@/UI/Layout/Popups/InterfacesAndEnums";
import { EndpointAction } from "../Types/TypesToEndpoint";
import { IJobInfoQueueEntry, InBrowserEndpoint } from "./InBrowserEndpoint";
import { startJob } from "./RunJob";

export interface IPausedJob {
    isPaused: boolean;
    timer: any;
    timerStart: number;
    totalWaitTime: number;
    jobToRun: IJobInfoQueueEntry | null;
}

/**
 * Checks the paused queue (if any) and determines whether it's ok to proceed
 * with selecting a new job.
 *
 * @param  {InBrowserEndpoint} endpoint  The in-browser endpoint.
 * @returns {boolean}  Whether it's ok to proceed.
 */
export function proceedAfterCheckPausedQueue(
    endpoint: InBrowserEndpoint
): boolean {
    if (!endpoint.pausedInfo.isPaused) {
        // Check if the queue is paused
        return true;
    }

    // If the queue is paused but jobs are still running, there's
    // nothing to do. You need to wait until all jobs finish before
    // asking user to confirm next job.
    if (endpoint.runningJobs.length > 0) {
        return false;
    }

    // The queue is paused and there are no jobs running. If the
    // queue hasn't been paused long, give the user the opportunity
    // to abort the next job before it runs.
    endpoint.pausedInfo.timerStart =
        endpoint.pausedInfo.timerStart === 0
            ? new Date().getTime()
            : endpoint.pausedInfo.timerStart;

    const timePassed = Date.now() - endpoint.pausedInfo.timerStart;
    if (timePassed < endpoint.pausedInfo.totalWaitTime) {
        _updateDelayedJobPopup(endpoint, timePassed);
        return false;
    }

    // If no specified job to run, can't proceed. This is a bug in the
    // code, so throw error.
    if (endpoint.pausedInfo.jobToRun === null) {
        throw new Error("Queue is paused, but no job to run specified.");
    }

    // Queue is paused, no jobs running, you've given user a chance
    // to cancel job. It's time to run the job.
    _runDelayedJob(endpoint);
    return false;
}

/**
 * Starts the paused queue timer. Adds job to paused queue so user has option of
 * cancelling.
 *
 * @param  {InBrowserEndpoint}  endpoint  The in-browser endpoint.
 * @param  {IJobInfoQueueEntry} jobToRun  The job to add to the paused queue.
 */
export function startPausedQueue(
    endpoint: InBrowserEndpoint,
    jobToRun: IJobInfoQueueEntry
) {
    if (endpoint.pausedInfo.timer) {
        clearTimeout(endpoint.pausedInfo.timer);
    }

    endpoint.pausedInfo = resetPausedInfo();
    endpoint.pausedInfo.jobToRun = jobToRun;
    endpoint.pausedInfo.totalWaitTime = jobToRun.delayRun as number;
    endpoint.pausedInfo.isPaused = true;

    // Note that timerStart needs to be 0 for now. It will be set
    // when ready.
    endpoint.pausedInfo.timerStart = 0;
}
/**
 * Closes the popup and actually runs the job after the paused queue is done.
 *
 * @param  {InBrowserEndpoint} endpoint  The in-browser endpoint.
 */
function _runDelayedJob(endpoint: InBrowserEndpoint) {
    if (endpoint.pausedInfo.jobToRun === null) {
        return;
    }

    pluginsApi.runPlugin("delayedjobpopup", {
        message: "",
        open: false,
    } as IDelayedJobPopup);
    startJob(endpoint, endpoint.pausedInfo.jobToRun);
    endpoint.pausedInfo = resetPausedInfo();
}

/**
 * Updates the delayed job popup with the time remaining. This also opens the
 * popup if it isn't already opened.
 *
 * @param  {InBrowserEndpoint} endpoint    The in-browser endpoint.
 * @param  {number}            timePassed  The time that's passed so far.
 */
function _updateDelayedJobPopup(
    endpoint: InBrowserEndpoint,
    timePassed: number
) {
    pluginsApi.runPlugin("delayedjobpopup", {
        open: true,
        runDelayedJob: () => {
            _runDelayedJob(endpoint);
        },
        cancelDelayedJob: () => {
            if (endpoint.pausedInfo.jobToRun === null) {
                return;
            }
            endpoint.processApiRequest({
                action: EndpointAction.CancelJobs,
                jobIds: [endpoint.pausedInfo.jobToRun.id],
            });
        },
        cancelAllDelayedJobsOfType: () => {
            endpoint.processApiRequest({
                action: EndpointAction.CancelAllJobsOfType,
                jobType: endpoint.pausedInfo.jobToRun?.commandName,
            });
        },
        cancelAllJobs: () => {
            endpoint.processApiRequest({
                action: EndpointAction.CancelAllJobs,
            });
        },
        waitTimePassed: timePassed,
        totalWaitTime: endpoint.pausedInfo.totalWaitTime,
        jobType: endpoint.pausedInfo.jobToRun?.commandName || "",
        jobId: endpoint.pausedInfo.jobToRun?.id || "",
    } as IDelayedJobPopup);
}

/**
 * Gets the default paused info parameters.
 *
 * @returns {IPausedJob}  The default paused info parameters.
 */
export function resetPausedInfo(): IPausedJob {
    return {
        isPaused: false,
        timer: null,
        timerStart: 0,
        totalWaitTime: 0,
        jobToRun: null,
    } as IPausedJob;
}
