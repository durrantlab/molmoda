import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { QueueParent } from "@/Queue/QueueParent";
import { IJobInfo } from "@/Queue/QueueTypes";

/**
 * A convert-with-openbabel queue.
 */
export class OpenBabelQueue extends QueueParent {
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

        // Remove any tree node (to avoid serialization issues).
        for (let i = 0; i < inputs.length; i++) {
            if (inputs[i].inputFile.treeNode !== undefined) {
                inputs[i].inputFile.treeNode = undefined;
            }
        }
        return runWorker(
            new Worker(new URL("./OpenBabel.worker.ts", import.meta.url)),
            inputs,
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
