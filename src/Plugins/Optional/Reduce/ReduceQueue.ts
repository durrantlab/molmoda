import { QueueParent } from "@/Queue/QueueParent";
import { IJobInfo } from "@/Queue/QueueTypes";
import { dynamicImports } from "@/Core/DynamicImports";

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
        return new Promise((resolve, reject) => {
            return (
                dynamicImports.reduce.module
                    .then((REDUCE_MODULE: any) => {
                        const startTime = performance.now();
                        let std = "";
                        let stdOut = "";
                        let stdErr = "";
                        const receptorPDB =
                            jobInfo.input.contents;

                        // https://emscripten.org/docs/api_reference/module.html

                        return REDUCE_MODULE({
                            noInitialRun: true,

                            // stderr will log when any file is read.
                            logReadFiles: true,

                            // onRuntimeInitialized() { console.log("Runtime initialized"); },

                            // preInit() { console.log("Pre-init"); },

                            preRun: [
                                (mod: any) => {
                                    // Save the contents of the files to the virtual
                                    // file system
                                    mod.FS.writeFile(
                                        "/receptor.pdb",
                                        receptorPDB
                                    );
                                },
                            ],

                            /**
                             * A helper function to locate WASM files.
                             *
                             * @param {string} path  The requested path.
                             * @returns {string}  The actual path to the WASM file.
                             */
                            locateFile(path: string): string {
                                // This is where the emscripten compiled files are
                                // located
                                return `./js/reduce/` + path;
                            },

                            /**
                             * A function that runs when the program exits.
                             */
                            onExit(/* code */) {
                                // Update with output
                                jobInfo.output = {
                                    std: std.trim(),
                                    stdOut: stdOut.trim(),
                                    stdErr: stdErr.trim(),
                                    output: stdOut,
                                    time: performance.now() - startTime,
                                };

                                // Resolve the promise with the output
                                resolve(jobInfo);
                            },

                            // Monitor stdout and stderr output
                            
                            /**
                             * A function that runs when stdout is written to.
                             * 
                             * @param {string} text  The text written to stdout.
                             */
                            print(text: string) {
                                console.log(text);
                                stdOut += text + "\n";
                                std += text + "\n";
                            },

                            /**
                             * A function that runs when stderr is written to.
                             * 
                             * @param {string} text  The text written to stderr.
                             */
                            printErr(text: string) {
                                console.log(text);
                                stdErr += text + "\n";
                                std += text + "\n";
                            },
                        });
                    })
                    .then((instance: any) => {
                        // Probably not needed, but just in case
                        return instance.ready;
                    })
                    .then((instance: any) => {
                        const argsList = ['-FLIP', '/receptor.pdb', '-DB', '/reduce_wwPDB_het_dict.txt'];
                        return instance.callMain(argsList);
                    })
                    .catch((err) => {
                        reject(err);
                        console.error(err);
                        throw err;
                    })
            );
        });
    }
}
