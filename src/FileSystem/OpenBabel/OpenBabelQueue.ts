import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { QueueParent } from "@/Queue/NewQueue/QueueParent";
import { IJobInfo } from "@/Queue/NewQueue/QueueTypes";

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
