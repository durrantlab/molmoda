import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { QueueParent } from "@/Queue/QueueParent";
import { IJobInfo } from "@/Queue/QueueTypes";
import { IFpocketParams } from "./FPocketWebTypes";
import { FileInfo } from "@/FileSystem/FileInfo";

/**
 * A calculate mol props queue.
 */
export class FPocketWebQueue extends QueueParent {
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
        
        const inputs2 = inputs.map((i) => {
            const pdbFile = i.pdbFile as FileInfo;
            return {
                pdbName: pdbFile.name,
                pdbContents: pdbFile.contents,
                userArgs: i.fpocketParams as IFpocketParams
            };
        });

        return runWorker(
            new Worker(new URL("./FPocketWeb.worker", import.meta.url)),
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
