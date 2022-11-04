/* eslint-disable @typescript-eslint/ban-types */

import { IToEndpointPayload } from "../Types/TypesToEndpoint";
import { InBrowserEndpoint } from "../InBrowserEndpoint/InBrowserEndpoint";
import { JobManagerParent } from "./JobManagerParent";
import { IEndpointResponse, IJobStatusInfo } from "../Types/TypesEndpointResponse";

let inBrowserEndpoint: InBrowserEndpoint | undefined;

/**
 * JobManagerForLocalQueue
 */
export class JobManagerForInBrowserEndpoint extends JobManagerParent {
    jobManagerName = "Local (In Browser) Queue";

    /**
     * Runs when job manager is created. Children can override. Use this instead
     * of the constructor.
     */
    onCreated() {
        inBrowserEndpoint = new InBrowserEndpoint();
        return;
    }

    /**
     * Sends an API request to the endpoint.
     *
     * @param  {IToEndpointPayload} payload  The payload to send.
     * @returns {Promise<IEndpointResponse>}  A promise that resolves
     *     with the response.
     */
    sendRequest(payload: IToEndpointPayload): Promise<IEndpointResponse> {
        const endPt = inBrowserEndpoint as InBrowserEndpoint;
        return endPt.getPayload(payload) as Promise<IEndpointResponse>;
    }

    /**
     * Runs when the status of any job changes.
     *
     * @param  {string}         jobId      The id of the job.
     * @param  {IJobStatusInfo} jobStatus  The job status.
     */
    onJobStatusChange(jobId: string, jobStatus: IJobStatusInfo): void {
        console.warn("Method not implemented.");
    }
}
