/* eslint-disable @typescript-eslint/ban-types */

const registeredJobTypes: { [key: string]: Function } = {};
const jobQueue: JobInfo[] = [];
let jobCurrentlyRunning = false;

export interface JobInfo {
    commandName: string;
    params: any;
}

function runNextJob(): void {
    // If a job is currently running, don't run another.
    if (jobCurrentlyRunning) {
        console.log("job currently running");
        return;
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
        // TODO: You might run runNextJob right away in some circumstances. But
        // in other cases should be a delay. Need to figure out how to pass
        // delay val on plugin-by-plugin basis.
    }
}

export function jobQueueSetup(): void {
    const checkJobAndRun = () => {
        console.log("Checking job queue.");

        runNextJob();

        // Check back in a second for any job updates.
        setTimeout(checkJobAndRun, 1000);
    };

    checkJobAndRun();
}


// Don't call this function directly! Do it through the api!
export function registerJobType(commandName: string, func: Function): void {
    registeredJobTypes[commandName] = func;
}

export function submitJobs(jobs: JobInfo[]): void {
    jobQueue.push(...jobs);
    runNextJob();
}