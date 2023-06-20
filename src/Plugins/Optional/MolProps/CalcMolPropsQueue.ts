import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { QueueParent } from "@/Queue/QueueParent";
import { IJobInfo } from "@/Queue/QueueTypes";

/**
 * A calculate mol props queue.
 */
export class CalcMolPropsQueue extends QueueParent {
    /**
     * Run a batch of jobs.
     *
     * @param {IJobInfo[]} inputBatch  The input batch.
     * @param {number}     procs       The number of processors to use.
     * @returns {Promise<IJobInfo[]>}  The output batch.
     */
    public runJobBatch(
        inputBatch: IJobInfo[],
        procs: number
    ): Promise<IJobInfo[]> {
        const inputs = inputBatch.map((jobInfo) => jobInfo.input);

        const inputs2 = {
            smilesStrs: inputs.map((input) => input.smilesStr),
            formatForTreeNode: inputs[0].formatForTreeNode,
        }

        return runWorker(
            new Worker(new URL("./CalcMolProps.worker", import.meta.url)),
            inputs2,
            true // auto terminate the worker.
        )
            .then((outputBatch) => {
                // Update .output value of each jobInfo.
                for (let i = 0; i < inputBatch.length; i++) {
                    inputBatch[i].output = outputBatch[i];
                }
                return inputBatch;
            })
            .catch((err) => {
                throw err;
            });
    }
}
