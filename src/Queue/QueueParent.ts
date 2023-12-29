// The purpose of this class is to maintain

import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import {
    doneInQueueStore,
    makeUniqJobId,
    startInQueueStore,
    updateProgressInQueueStore,
} from "./QueueStore";
import { IJobInfo, IQueueCallbacks } from "./QueueTypes";

/**
 * The parent class for all queues. This class is not meant to be used directly.
 * It is meant to be extended by a child class that implements the runJobBatch()
 * method.
 */
export abstract class QueueParent {
    private _maxTotalProcs: number;
    private _procsPerJobBatch: number;

    // Each batch of inputs runs per job. Inputs are batched because it might be
    // useful to not create and destroy workers for every single job. So it
    // happens per batch, not per job. But note that batchSize is 1 by default.
    private _inputBatches: IJobInfo[][] = [];

    // This is just for reporting. Not actually used for anything beyond that.
    private _jobsCurrentlyRunning: { [index: number]: IJobInfo } = {};

    // The outputs of each job are stored here. Not batched.
    private _outputs: IJobInfo[] = [];

    // A timer that checks job status every so often to add new jobs to the
    // queue if appropriate.
    private _queueTimer: any;

    // How many processors are being currently used by jobs in the queue.
    private _numProcsCurrentlyRunning = 0;

    private _callbacks: IQueueCallbacks | undefined;

    // The total number of jobs
    private _numTotalJobs: number;

    // An id unique to this queue.
    private _id: string;

    private _showInQueue: boolean;

    // If this is true, job will be cancelled as soon as possible.
    protected jobsCancelling: boolean;

    // The done promise is resolved when the queue is finished. Same as the
    // callback, but promised based if that's your preference.
    public done: Promise<any>;
    public _doneResolveFunc: any;

    /**
     * The class constructor.
     *
     * @param {string|undefined} jobTypeId                 A string that
     *                                                     identifies the type
     *                                                     of job.
     * @param {any[]}            inputs                    An flat array of
     *                                                     inputs to be
     *                                                     processed.
     * @param {IQueueCallbacks}  [callbacks=undefined]     The callbacks to be
     *                                                     used by the queue, if
     *                                                     any.
     * @param {number}           [procsPerJobBatch=1]      The number of
     *                                                     processors that can
     *                                                     be used by each batch
     *                                                     of jobs.
     * @param {number}           [simulBatches=undefined]  The max number of
     *                                                     batches to run
     *                                                     simultaneously. If
     *                                                     undefined, calculated
     *                                                     as maxProcs /
     *                                                     procsPerJobBatch (to
     *                                                     run as many batches
     *                                                     at same time as
     *                                                     possible). 
     * @param {number}           [batchSize=undefined]     The number of jobs
     *                                                     per batch. If
     *                                                     undefined, calculated
     *                                                     as inputs.length /
     *                                                     simulBatches.
     * @param {boolean}          [showInQueue=true]        Whether to show this
     *                                                     job in the queue.
     */
    constructor(
        jobTypeId: string,
        inputs: any[],
        callbacks?: IQueueCallbacks,
        procsPerJobBatch = 1,
        simulBatches?: number,
        batchSize: number | undefined = undefined,
        showInQueue = true
    ) {
        this._numTotalJobs = inputs.length;
        this._procsPerJobBatch = procsPerJobBatch;
        this._callbacks = callbacks;
        this.jobsCancelling = false;
        this._showInQueue = showInQueue;

        // Adjust max number of processors to be used by the queue if necessary.
        // Useful if there are very few items in the queue.
        this._maxTotalProcs = getSetting("maxProcs");
        this._maxTotalProcs = Math.min(
            this._maxTotalProcs,
            this._numTotalJobs * this._procsPerJobBatch
        );

        if (simulBatches === undefined) {
            simulBatches = Math.floor(this._maxTotalProcs / this._procsPerJobBatch);
        }
        this._maxTotalProcs = Math.min(
            this._maxTotalProcs,
            simulBatches * this._procsPerJobBatch
        );

        // this._maxTotalProcs -= this._maxTotalProcs % batchSize;

        if (batchSize === undefined) {
            // If batch size isn't defined, make it big enough to use all the
            // processors. Letting the user define this specifically in case
            // they want to use the onJobDone callback to do something with the
            // outputs as they become available, instead of using the
            // onQueueDone callback (when everything done).
            batchSize = Math.ceil(inputs.length / simulBatches);
        }

        this._id = makeUniqJobId(jobTypeId);

        this.done = new Promise((resolve) => {
            this._doneResolveFunc = resolve;
        });

        this._onQueueStart();

        // Copy inputs into IJobInfo[]. Use map.
        const inputInfos = inputs.map((input, index) => {
            return {
                index,
                input: input,
            } as IJobInfo;
        });

        // Split the inputs into batches. Keep in mind that the size of inputs
        // may not be exactly divisible by batchSize.
        for (let i = 0; i < inputInfos.length; i += batchSize) {
            this._inputBatches.push(inputInfos.slice(i, i + batchSize));
        }

        // this._reportQueueStatusForDebug();

        this._queueTimer = setInterval(() => {
            // If there are no jobs left in _inputBatches, stop the timer.
            if (this._inputBatches.length === 0) {
                clearInterval(this._queueTimer);
                return;
            }

            if (this.jobsCancelling) {
                // Note that this._queueTimer is not cleared here. It is cleared
                // elsewhere.
                return;
            }

            this._fillQueueToCapacity();
        }, 250);
    }

    /**
     * A function that shows the status of the queue in the console. This is
     * only for debugging.
     */
    private _reportQueueStatusForDebug() {
        let lastNumJobsFinished = 0;

        setInterval(() => {
            // How many jobs are in this._inputBatches, noting that it is a list of
            // lists?
            let numJobsNotStarted = 0;
            for (const batch of this._inputBatches) {
                numJobsNotStarted += batch.length;
            }
            const jobsRunning = Object.keys(this._jobsCurrentlyRunning).length;
            const numJobsFinished = this._outputs.length;

            if (numJobsFinished === lastNumJobsFinished) {
                // No change since last time. Don't report.
                return;
            }
            lastNumJobsFinished = numJobsFinished;

            // clear console
            // console.clear();

            console.log("Jobs not yet started:", numJobsNotStarted);
            console.log("Jobs running:", jobsRunning);
            console.log("Jobs finished:", numJobsFinished);
        }, 100);
    }

    /**
     * A function that fills the queue to capacity with new running jobs. This
     * function is called every so often by a timer.
     */
    private _fillQueueToCapacity() {
        // Start jobs until the queue is full or there are no more jobs.
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (this.jobsCancelling) {
                return;
            }

            if (this._inputBatches.length === 0) {
                // No more input batches to add.
                break;
            }

            if (
                this._numProcsCurrentlyRunning + this._procsPerJobBatch >
                this._maxTotalProcs
            ) {
                // Adding job wouldn't fit in the queue.
                break;
            }

            const inputBatch = this._inputBatches.shift();
            if (!inputBatch) {
                // No more input batches to add.
                break;
            }

            // Add jobs to the _jobsCurrentlyRunning list.
            for (const jobInfo of inputBatch) {
                this._jobsCurrentlyRunning[jobInfo.index] = jobInfo;
            }

            this._numProcsCurrentlyRunning += this._procsPerJobBatch;
            this.runJobBatch(inputBatch, this._procsPerJobBatch)
                .then((outBatch: any[]) => {
                    this._outputs.push(...outBatch);
                    this._numProcsCurrentlyRunning -= this._procsPerJobBatch;

                    // Remove jobs from the _jobsCurrentlyRunning list
                    for (const jobInfo of inputBatch) {
                        delete this._jobsCurrentlyRunning[jobInfo.index];
                    }

                    // Call the onJobDone callback for each job in the batch.
                    for (const jobInfo of inputBatch) {
                        this._onJobDone(jobInfo);
                    }

                    // Call the onProgress callback.
                    this._onProgress(this._outputs.length / this._numTotalJobs);

                    // Check if there are no jobs left.
                    if (
                        Object.keys(this._jobsCurrentlyRunning).length === 0 &&
                        this._inputBatches.length === 0
                    ) {
                        // No jobs left. Call the onQueueDone callback.
                        this._onQueueDone(this._outputs);
                    }

                    return;
                })
                .catch((err) => {
                    // throw err;

                    // TODO: Never gets here. Why?
                    console.error("Error running job:", err);
                    this._numProcsCurrentlyRunning -= this._procsPerJobBatch;

                    // Call the onError callback for each job in the batch.
                    this._onError(inputBatch, err);

                    // TODO: Throw error here?
                    throw err;
                });
        }
    }

    /**
     * The onQueueStart callback to call when the queue starts.
     */
    private _onQueueStart() {
        if (this._showInQueue) {
            startInQueueStore(this._id, this._maxTotalProcs, () => {
                // This function allows the queue to be cancelled from an external
                // location.
    
                // To the extent possible, abort currently running jobs.
                this.jobsCancelling = true;
    
                // Stop the timer that will try to submit additional jobs
                clearInterval(this._queueTimer);
            });
        }
    }

    /**
     * The onJobDone callback to called when a single job is done.
     *
     * @param {IJobInfo} jobInfo  The job info of the job that is done.
     */
    private _onJobDone(jobInfo: IJobInfo) {
        if (this._callbacks && this._callbacks.onJobDone) {
            this._callbacks.onJobDone(jobInfo.output);
        }
    }

    /**
     * The onError callback to called when a batch of jobs fails.
     *
     * @param {IJobInfo[]} jobInfos  The job infos of the failed batch.
     * @param {any}        error     The error.
     */
    private _onError(jobInfos: IJobInfo[], error: any) {
        const payloadsOfBatchThatFailed = jobInfos.map((jobInfo) => {
            return jobInfo.input;
        });

        if (this._callbacks && this._callbacks.onError) {
            this._callbacks.onError(payloadsOfBatchThatFailed, error);
        }
    }

    /**
     * The onQueueDone callback to called when the queue (all jobs) is done.
     *
     * @param {IJobInfo[]} outputJobs  The output jobs.
     */
    private _onQueueDone(outputJobs: IJobInfo[]) {
        // Sort the output jobs by their original index.
        outputJobs.sort((a, b) => a.index - b.index);

        // Get the payloads of the outputs.
        const outputPayloads = outputJobs.map((jobInfo) => jobInfo.output);

        if (this._showInQueue) {
            doneInQueueStore(this._id);
        }

        if (this._callbacks && this._callbacks.onQueueDone) {
            this._callbacks.onQueueDone(outputPayloads);
        }

        // Also resolve the promise, in case promise is being used instead of
        // callbacks.
        this._doneResolveFunc(outputPayloads);
    }

    /**
     * The onProgress callback to update the progress.
     *
     * @param {number} percent  The percent of jobs that have been completed.
     */
    private _onProgress(percent: number) {
        if (this._showInQueue) {
            updateProgressInQueueStore(this._id, percent);
        }
        if (this._callbacks && this._callbacks.onProgress) {
            this._callbacks.onProgress(percent);
        }
    }

    /**
     * Run a batch of jobs.
     *
     * @param {IJobInfo[]} inputBatch  The batch of inputs to run.
     * @param {number}     procs       The number of processes to use to run the
     *                                 batch.
     * @returns {Promise<IJobInfo[]>}  A promise that resolves to the output
     *                                 when all the jobs are done. Put the
     *                                 output of each job in jobInfo.output.
     */
    public abstract runJobBatch(
        inputBatch: IJobInfo[],
        procs: number
    ): Promise<IJobInfo[]>;
}
