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
                const errorMessages: string[] = [];
                for (let i = 0; i < outputBatch.length; i++) {
                    const output = outputBatch[i];
                    const input = inputs[i];
                    if (
                        output.stdErr &&
                        output.stdErr.toLowerCase().includes("error")
                    ) {
                        if (input.surpressMsgs) {
                            continue;
                        }
                        const stdErr = output.stdErr;
                        let errorMessage: string;
                        if (
                            stdErr.includes("Cannot enlarge memory") ||
                            stdErr.includes("(OOM)")
                        ) {
                            errorMessage = `The molecule '${input.inputFile.name}' is too large to process due to memory limitations.`;
                        } else {
                            let details = stdErr.replace("Open Babel ", "");
                            details = details.replace(/^=+$/gm, "");
                            details = details.replace(/^\*{1,10}/gm, "");
                            details = details.trim();
                            details = details.replace(/([^.!?])$/gm, "$1.");
                            details = details.replace(/\s{2,}/g, " ");
                            details = details.trim();
                            details = details.replace(/\n/g, " ");
                            errorMessage = `Could not process '${input.inputFile.name}'. The structure may be too large or the format incorrect. Technical details: ${details}`;
                        }
                        errorMessages.push(errorMessage);
                    }
                }
                if (errorMessages.length > 0) {
                    let finalMessage = "";
                    if (errorMessages.length === 1) {
                        finalMessage = errorMessages[0];
                    } else {
                        finalMessage =
                            "<p>Multiple errors occurred during processing:</p><ul><li>" +
                            errorMessages.join("</li><li>") +
                            "</li></ul>";
                    }
                    messagesApi.popupError(finalMessage);
                }
                // If any of the files have {ERROR} in them, let user know and
                // remove from outputBatch.
                for (let i = 0; i < outputBatch.length; i++) {
                    if (outputBatch[i].outputFiles) {
                        outputBatch[i].outputFiles = outputBatch[
                            i
                        ].outputFiles.filter(
                            (file: string | undefined) =>
                                file !== "{ERROR}" && file !== undefined
                        );
                    } else {
                        outputBatch[i].outputFiles = [];
                    }
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
