import { QueueParent } from "@/Queue/QueueParent";
import { IJobInfo } from "@/Queue/QueueTypes";
import { dynamicImports } from "@/Core/DynamicImports";

/**
 * A calculate mol props queue.
 */
export class WebinaQueue extends QueueParent {
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
                dynamicImports.webina.module
                    .then((WEBINA_MODULE: any) => {
                        const startTime = performance.now();
                        let std = "";
                        let stdOut = "";
                        let stdErr = "";
                        const ligandPDBQT =
                            jobInfo.input.pdbFiles.cmpd.contents;
                        const receptorPDBQT =
                            jobInfo.input.pdbFiles.prot.contents;

                        // https://emscripten.org/docs/api_reference/module.html

                        return WEBINA_MODULE({
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
                                        "/receptor.pdbqt",
                                        receptorPDBQT
                                    );
                                    mod.FS.writeFile(
                                        "/ligand.pdbqt",
                                        ligandPDBQT
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
                                return `./js/webina/` + path;
                            },

                            /**
                             * A function that runs when the program exits.
                             */
                            onExit(/* code */) {
                                // Read the contents of the output file
                                const output = (this as any).FS.readFile(
                                    "/output.pdbqt",
                                    {
                                        encoding: "utf8",
                                    }
                                );

                                // Update with output
                                jobInfo.output = {
                                    std: std.trim(),
                                    stdOut: stdOut.trim(),
                                    stdErr: stdErr.trim(),
                                    output: output,
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
                        const argsList = [];
                        for (const key in jobInfo.input.webinaParams) {
                            const val = jobInfo.input.webinaParams[key];
                            if ([true, "true"].indexOf(val) !== -1) {
                                argsList.push(`--${key}`);
                            } else if ([false, "false"].indexOf(val) !== -1) {
                                // do nothing
                            } else {
                                argsList.push(`--${key}`);
                                argsList.push(val.toString());
                            }
                        }

                        return instance.callMain(argsList);
                    })
                    // .then((resp: any) => {
                    //     return resp;
                    // })
                    .catch((err) => {
                        reject(err);
                        console.error(err);
                        throw err;
                    })
            );
        });
    }
}
