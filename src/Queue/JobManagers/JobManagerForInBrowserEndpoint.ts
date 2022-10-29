import { IApiPayload, IApiResponse, IJobStatusInfo } from "../Definitions";
import { JobManagerParent } from "./JobManagerParent";

/**
 * JobManagerForLocalQueue
 */
export class JobManagerForInBrowserEndpoint extends JobManagerParent {
    /**
     * Runs when job manager is created. Children can override. Use this instead
     * of the constructor.
     */
     onCreated() {
        return;
    }

    /**
     * Sends an API request to the endpoint.
     *
     * @param  {IApiPayload} payload  The payload to send.
     * @returns {Promise<IApiResponse>}  A promise that resolves with the
     *     response.
     */
    sendApiRequest(payload: IApiPayload): Promise<IApiResponse> {
        throw new Error("Method not implemented.");
    }

    /**
     * Runs when the status of any job changes.
     * 
     * @param  {string}     jobId      The id of the job.
     * @param  {IJobStatusInfo} jobStatus  The job status.
     */
     onJobStatusChange(jobId: string, jobStatus: IJobStatusInfo): void {
        throw new Error("Method not implemented.");
    }
    
}