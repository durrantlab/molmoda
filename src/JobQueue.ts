/* eslint-disable @typescript-eslint/ban-types */

const registeredJobTypes: { [key: string]: Function } = {};
const jobQueue: JobInfo[] = [];
let jobCurrentlyRunning = false;

export interface JobInfo {
    commandName: string;
    params: any;
    delayAfterRun?: number;  // MS
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
        const job = jobQueue.shift() as JobInfo;
        const func = registeredJobTypes[job.commandName];
        jobCurrentlyRunning = true;
        console.log("Running job.");
        func(job.params);
        console.log("Done running job.");
        jobCurrentlyRunning = false;

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
 * @param  {JobInfo[]} jobs  The job to submit.
 */
export function submitJobs(jobs: JobInfo[]) {
    jobQueue.push(...jobs);
    _runNextJob();
}
