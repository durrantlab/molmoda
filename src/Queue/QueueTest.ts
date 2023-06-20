import { QueueParent } from "./QueueParent";
import { IJobInfo } from "./QueueTypes";

/**
 * A test queue.
 */
export class QueueTest extends QueueParent {
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
        // onBatchDone: (outputBatch: IJobInfo[]) => void
    ): Promise<IJobInfo[]> {
        // TODO: Children must define this. Defining it here only for debugging.

        // Start a new job.
        // console.log("Starting job with input batch:", inputBatch);

        // Simulate a job that takes a random number of seconds to complete.
        return new Promise((resolve) => {
            setTimeout(() => {
                // console.log("Finished job with input batch:", inputBatch);
                // if (Math.random() < 0.1) {
                //     // Simulate an error.
                //     throw new Error("Simulated error");
                // }

                resolve(
                    inputBatch.map((jobInfo) => {
                        jobInfo.output = "A-" + (jobInfo.input * 2).toString();
                        return jobInfo;
                    })
                );
            }, Math.random() * 25000);
        });
    }
}
