// All job managers must extend this one. It is the class that submits JSON
// commands to the EndPoint API (whether a remote url or the in-browser queue
// system).

import {
    IApiPayload,
    IApiResponse,
    IJobStatusInfo,
    IJobInfo,
    PayloadAction,
    ResponseStatus,
} from "../Definitions";

/**
 * JobManagerParent
 */
export abstract class JobManagerParent {
    /**
     * Sends an API request to the endpoint. Common function that all payloads
     * pass through before going to the end point.
     *
     * @param  {IApiPayload} payload  The payload to send.
     * @returns {Promise<IApiResponse>}  A promise that resolves with the
     *     response.
     */
    abstract sendApiRequest(payload: IApiPayload): Promise<IApiResponse>;

    /**
     * Runs when the status of any job changes.
     * 
     * @param  {string}     jobId      The id of the job.
     * @param  {IJobStatusInfo} jobStatus  The job status.
     */
    abstract onJobStatusChange(jobId: string, jobStatus: IJobStatusInfo): void;

    // Use to keep track of changes.
    private _jobStatuses: IJobStatusInfo[] = [];

    /**
     * The constructor.
     *
     * @param  {number} [maxNumProcessors=1]  The maximum number of processors
     *                                        that all jobs can use together.
     *                                        Approximate value. Defaults to 1.
     */
    constructor(maxNumProcessors = 1) {
        this.updateMaxNumProcessors(maxNumProcessors);
        this.onCreated();

        // TODO: Timer here to call getJobs every so often?
    }

    /**
     * Runs when job manager is created. Children can override. Use this instead
     * of the constructor.
     */
    protected onCreated() {
        return;
    }

    /**
     * Submit a job to the queue system.
     *
     * @param  {IJobInfo[]|IJobInfo} jobSubmitInfos  The job(s) to
     *                                                           submit.
     * @returns {Promise<ResponseStatus>}  A promise that resolves with the
     *                                     response status.
     */
    public submitJobs(
        jobSubmitInfos: IJobInfo[] | IJobInfo
    ): Promise<ResponseStatus> {
        jobSubmitInfos = this.makeArray(jobSubmitInfos);

        // If number of processors isn't specified on any job, use 1 as a
        // default.
        for (const jobSubmitInfo of jobSubmitInfos) {
            if (jobSubmitInfo.numProcessors === undefined) {
                jobSubmitInfo.numProcessors = 1;
            }
        }

        return this.sendApiRequest({
            action: PayloadAction.SubmitJobs,
            jobInfos: jobSubmitInfos,
        })
            .then((response: IApiResponse): ResponseStatus => {
                this.throwErrorIfNotSuccess(response);
                return response.responseStatus;
            })

            .catch((error) => {
                console.error(error);
                return error;
            });
    }

    /**
     * Gets the status of all the current jobs.
     *
     * @returns {Promise<IJobStatusInfo[]>}  A promise that resolves with the job
     *                                   statuses.
     */
    public getJobs(): Promise<IJobStatusInfo[]> {
        return this.sendApiRequest({
            action: PayloadAction.GetJobsInfo,
        } as IApiPayload)
            .then((response: IApiResponse): IJobStatusInfo[] => {
                this.throwErrorIfNotSuccess(response);

                const jobStatuses = response.jobStatuses as IJobStatusInfo[];

                // Figure out if any job statuses have changed. First, are there
                // jobs in jobStatuses that are not in this._jobStatuses?
                for (const jobStatus of jobStatuses) {
                    // Determine if this job is in this._jobStatuses.
                    const found = this._jobStatuses.find(
                        (js) => js.id === jobStatus.id
                    );
                    if (!found) {
                        // It's not. So it's a new job.
                        this.onJobStatusChange(jobStatus.id, jobStatus);

                        // Also update this._jobStatuses.
                        this._jobStatuses.push(jobStatus);
                    } else {
                        // It is in this._jobStatuses. So it's not new. But has
                        // its status changed?
                        if (found.status !== jobStatus.status) {
                            // Yes. So call onJobStatusChange.
                            this.onJobStatusChange(jobStatus.id, jobStatus);

                            // Also update this._jobStatuses.
                            found.status = jobStatus.status;
                        }
                    }

                    // NOTE: You're not checking if a job has been removed from
                    // this._jobStatuses. That's because this class doesn't
                    // currently support that. Items can only be added to
                    // this._jobStatuses, not removed.
                }

                return jobStatuses;
            })
            .catch((error) => {
                console.error(error);
                return error;
            });
    }

    /**
     * Cancels a job or jobs.
     *
     * @param  {string[]|string} ids  The id(s) of the job(s) to cancel.
     * @returns {Promise<ResponseStatus>}  A promise that resolves with the
     *     response status.
     */
    public cancelJobs(ids: string[] | string): Promise<ResponseStatus> {
        ids = this.makeArray(ids);

        return this.sendApiRequest({
            action: PayloadAction.CancelJobs,
            jobIds: ids,
        })
            .then((response: IApiResponse): ResponseStatus => {
                this.throwErrorIfNotSuccess(response);
                return response.responseStatus;
            })
            .catch((error) => {
                console.error(error);
                return error;
            });
    }

    /**
     * Tells the queue system that job(s) have been incorporated (so they can be
     * deleted remotely if needed).
     *
     * @param  {string[]|string} jobIds  The id(s) of the job(s) to update.
     * @returns {Promise<ResponseStatus>}  A promise that resolves with the
     *     response status.
     */
    public informJobsIncorporated(
        jobIds: string[] | string
    ): Promise<ResponseStatus> {
        jobIds = this.makeArray(jobIds);

        return this.sendApiRequest({
            action: PayloadAction.UpdateJobIncorporated,
            jobIds: jobIds,
        })
            .then((response: IApiResponse): ResponseStatus => {
                this.throwErrorIfNotSuccess(response);
                return response.responseStatus;
            })
            .catch((error) => {
                console.error(error);
                return error;
            });
    }

    /**
     * Tells the queue system the maximum number of processors to use for all
     * jobs together. Approximate value (might be a little more or less).
     *
     * @param  {number} maxNumProcessors  The max number of processors to use.
     * @returns {Promise<ResponseStatus>}  A promise that resolves with the
     *     response status.
     */
    public updateMaxNumProcessors(
        maxNumProcessors: number
    ): Promise<ResponseStatus> {
        return this.sendApiRequest({
            action: PayloadAction.UpdateMaxNumProcessors,
            maxNumProcessors: maxNumProcessors,
        })
            .then((response: IApiResponse): ResponseStatus => {
                this.throwErrorIfNotSuccess(response);
                return response.responseStatus;
            })
            .catch((error) => {
                console.error(error);
                return error;
            });
    }

    /**
     * Throws an error if the response status is an error.
     *
     * @param  {IApiResponse} response  The response to check.
     */
    private throwErrorIfNotSuccess(response: IApiResponse) {
        if (response.responseStatus === ResponseStatus.Error) {
            throw new Error(response.errorMsg);
        }
    }

    /**
     * Makes an array out of a single item or an array.
     *
     * @param  {any} input  The input to make into an array.
     * @returns {any[]}  The input as an array.
     */
    private makeArray(input: any): any[] {
        if (Array.isArray(input)) {
            return input;
        } else {
            return [input];
        }
    }
}
