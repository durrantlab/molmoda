import { QueueParent } from "@/Queue/QueueParent";
import { IJobInfo } from "@/Queue/QueueTypes";
import { runWorker } from "@/Core/WebWorkers/RunWorker";

/**
 * A reduce (prepare protein) queue.
 */
export class ReduceQueue extends QueueParent {
    /**
     * Run a batch of jobs.
     *
     * @param {IJobInfo[]} inputBatch  The input batch.
     * @param {number}     procs       The number of processors to use.
     * @returns {Promise<IJobInfo[]>}  The output batch.
     */
    public async runJobBatch(
        inputBatch: IJobInfo[],
        procs: number
    ): Promise<IJobInfo[]> {
        const outputs: IJobInfo[] = [];
        for (const jobInfo of inputBatch) {
            // NOTE: Choosing to do this one protein at a time. TODO: Could
            // batch if you end up thinking it's necessary. Would require some
            // refactoring.
            outputs.push(await this._runJob(jobInfo));
        }

        return outputs;
    }

    /**
     * Run a single job.
     *
     * @param {IJobInfo} jobInfo  The job to run.
     * @returns {Promise<IJobInfo>}  The output job.
     */
    private async _runJob(jobInfo: IJobInfo): Promise<IJobInfo> {
        debugger;
        // treeNode not serializable, and not needed, so remove it.
        jobInfo.input.treeNode = undefined;

        return runWorker(
            new Worker(new URL("./Reduce.worker", import.meta.url)),
            jobInfo,
            true // auto terminate the worker.
        )
            .then((response) => {
                // Update .output value
                jobInfo.output = response.output;
                return jobInfo;
            })
            .catch((err) => {
                throw err;
            });
    }
}
