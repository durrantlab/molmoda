/* eslint-disable @typescript-eslint/ban-types */

import { IJobInfoToEndpoint } from "./Types/TypesToEndpoint";
import { JobManagerForInBrowserEndpoint } from "./JobManagers/JobManagerForInBrowserEndpoint";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";

// Endpoints here
let jobManagerForInBrowserEndpoint: JobManagerForInBrowserEndpoint;
// TODO: local and remote server endpoints defined here too.


/**
 * Setup the job queue system.
 */
export function jobQueueSetup() {
    console.warn("jobQueueSetup");
    const nprocs = getSetting("maxProcs");
    jobManagerForInBrowserEndpoint = new JobManagerForInBrowserEndpoint(nprocs)

    // TODO: Setup local and remote server endpoints here too.
}

/**
 * Submit a job to the queue.
 *
 * @param  {IJobInfoToEndpoint[]} jobs  The job to submit.
 */
export function submitJobs(jobs: IJobInfoToEndpoint[]) {
    // TODO: Currently hard coded just in-browser endpoint. But eventually, make
    // this compatible with all three endpoints (specific which in this
    // function). Good to have separate ts file for interacting with all queues.
    // Would be good to make it so can access public functions on all queues too
    // (specifing which queue perhaps with an enum).
    jobManagerForInBrowserEndpoint.submitJobs(jobs);
}
