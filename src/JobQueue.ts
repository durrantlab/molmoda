/* eslint-disable @typescript-eslint/ban-types */

import { messagesApi } from "@/Api/Messages";

const registeredJobTypes: { [key: string]: Function } = {};
const jobQueue: IJobInfo[] = [];
let jobCurrentlyRunning = false;

export interface IJobInfo {
    commandName: string;
    params: any;
    id: string;
    delayAfterRun?: number; // MS
}

/**
 * Run the next job in the queue.
 *
 * @returns {number}  The number milliseconds to wait after running the job.
 */
function _runNextJob(): number {
    // If a job is running, don't run another.
    if (jobCurrentlyRunning) {
        console.log("job currently running");
        return 1000;
    }

    // Run a job if there's one available in the queue.
    if (jobQueue.length > 0) {
        messagesApi.waitSpinner(true);

        const job = jobQueue.shift() as IJobInfo;
        const func = registeredJobTypes[job.commandName];
        jobCurrentlyRunning = true;
        console.log("Running job.");
        const resp = func(job.id, job.params);
        if (resp instanceof Promise) {
            resp.then(() => {
                console.log("Done running job.");
                jobCurrentlyRunning = false;
                messagesApi.waitSpinner(false);
                return;
            })
            .catch(() => {
                console.log("Done running job.");
                console.warn("error");
                jobCurrentlyRunning = false;
                messagesApi.waitSpinner(false);
            });
        } else {
            console.log("Done running job.");
            jobCurrentlyRunning = false;
            messagesApi.waitSpinner(false);
        }

        // If delay not defined or 0, run next one in queue.
        if (job.delayAfterRun === undefined || job.delayAfterRun === 0) {
            return 0;
        }

        // If there's a delay, wait for it to expire.
        return job.delayAfterRun;

        // TODO: If delay is defined, needs to be hook to run something (e.g.,
        // cancel now button).
    }

    return 1000;
}

/**
 * Setup the job queue system.
 */
export function jobQueueSetup() {
    const checkJobAndRun = () => {
        console.log("Checking job queue.");

        const delayTime = _runNextJob();

        // Check back in a bit for any job updates.
        if (delayTime === 0) {
            checkJobAndRun();
        } else {
            setTimeout(checkJobAndRun, delayTime);
        }
    };

    checkJobAndRun();
}

/**
 * Register a class of job/command. Don't call this function directly! Do it
 * through the api!
 *
 * @param  {string}   commandName  The name of the command.
 * @param  {Function} func         The function to run when the command is
 *                                 called.
 */
export function registerJobType(commandName: string, func: Function) {
    registeredJobTypes[commandName] = func;
}

/**
 * Submit a job to the queue.
 *
 * @param  {IJobInfo[]} jobs  The job to submit.
 */
export function submitJobs(jobs: IJobInfo[]) {
    jobQueue.push(...jobs);
    _runNextJob();
}
