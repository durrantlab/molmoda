import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { QueueParent } from "@/Queue/QueueParent";
import { IJobInfo } from "@/Queue/QueueTypes";
import { messagesApi } from "@/Api/Messages";

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
            .then((outputBatch: any[]) => {
                // Determine if the word "error" (case insensitive) is in any of the 
                // stdErr properties.
                let errMsg = "";
                for (let i = 0; i < outputBatch.length; i++) {
                    if (outputBatch[i].stdErr && outputBatch[i].stdErr.toLowerCase().includes("error")) {
                        let toAdd = outputBatch[i].stdErr;
                        toAdd = toAdd.replace("Open Babel ", "");
                        
                        // Remove any line where the line contains only =
                        toAdd = toAdd.replace(/^=+$/gm, "");
                        
                        // Remove "*" at start of line
                        toAdd = toAdd.replace(/^\*{1,10}/gm, "");

                        toAdd = toAdd.trim();

                        // Any line that does not end in punctuation (.?!), add a period.
                        toAdd = toAdd.replace(/([^.!?])$/gm, "$1.");
                        
                        toAdd = toAdd.replace(/\s{2,}/g, " ");
                        toAdd = toAdd.trim();

                        // New lines become spaces.
                        toAdd = toAdd.replace(/\n/g, " ");

                        if (inputs[i].surpressMsgs !== true) {
                            errMsg = "One or more input molecules could not be processed. Perhaps one of your structures is too large, or the format is incorrect. Technical details: " + errMsg + toAdd + "\n";
                        }
                    }
                }
                if (errMsg !== "") {
                    messagesApi.popupError(errMsg);
                }

                // debugger;

                // If any of the files have {ERROR} in them, let user know and
                // remove from outputBatch.
                for (let i = 0; i < outputBatch.length; i++) {
                    for (let j = 0; j < outputBatch[i].outputFiles.length; j++) {
                        if (outputBatch[i].outputFiles[j] == "{ERROR}") {
                            outputBatch[i].outputFiles[j] = undefined;
                        }
                    }

                    // Remove ones that are undefined
                    outputBatch[i].outputFiles = outputBatch[i].outputFiles.filter(
                        (x: any) => x !== undefined
                    );
                }

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
