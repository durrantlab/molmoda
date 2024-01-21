import { QueueParent } from "@/Queue/QueueParent";
import { IJobInfo } from "@/Queue/QueueTypes";
import { dynamicImports } from "@/Core/DynamicImports";
import { ITest } from "@/Testing/TestCmd";

/**
 * A calculate mol props queue.
 */
export class WebinaQueue extends QueueParent {
    /**
     * Make a webina instance.
     * 
     * @param {*} WEBINA_MODULE  The webina module.
     * @returns {Promise<any>}  Resolves with the webina instance.
     */
    private _makeWebinaInstance(WEBINA_MODULE: any): Promise<any> {
        const startTime = performance.now();
        let std = "";
        let stdOut = "";
        let stdErr = "";

        // https://emscripten.org/docs/api_reference/module.html

        return WEBINA_MODULE({
            noInitialRun: true,

            // stderr will log when any file is read.
            logReadFiles: true,

            // onRuntimeInitialized() { console.log("Runtime initialized"); },

            // preInit() { console.log("Pre-init"); },

            // You must manually set these two before running the module.
            jobInfoPayload: {} as IJobInfo,
            doneCallbackFunc: () => {
                return;
            },

            /**
             * A function that runs before the program starts.
             *
             * @param {IJobInfo} jobInfo           The job info.
             * @param {Function} doneCallbackFunc  The callback function to call
             *                                     when the job is done.
             */
            setupRun: function (
                jobInfo: IJobInfo,
                doneCallbackFunc: (jobInfo: IJobInfo) => void
            ) {
                this.jobInfoPayload = jobInfo;
                this.doneCallbackFunc = doneCallbackFunc;

                // Get the PDBQT contents from this.jobInfoPayload, which
                // must be manually before running.

                const ligandPDBQT =
                    this.jobInfoPayload.input.pdbFiles.cmpd.contents;
                const receptorPDBQT =
                    this.jobInfoPayload.input.pdbFiles.prot.contents;

                // Save the contents of the files to the virtual
                // file system
                this.FS.writeFile("/receptor.pdbqt", receptorPDBQT);
                this.FS.writeFile("/ligand.pdbqt", ligandPDBQT);
            },

            preRun: [
                (/* mod: any */) => {
                    // // Get the PDBQT contents from this.jobInfoPayload, which
                    // // must be manually before running.
                    // const ligandPDBQT = mod.jobInfoPayload.input.pdbFiles.cmpd.contents;
                    // const receptorPDBQT = mod.jobInfoPayload.input.pdbFiles.prot.contents;
                    // // Save the contents of the files to the virtual
                    // // file system
                    // mod.FS.writeFile(
                    //     "/receptor.pdbqt",
                    //     receptorPDBQT
                    // );
                    // mod.FS.writeFile("/ligand.pdbqt", ligandPDBQT);
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
                // Update with output
                this.jobInfoPayload.output = {
                    std: std.trim(),
                    stdOut: stdOut.trim(),
                    stdErr: stdErr.trim(),
                    time: performance.now() - startTime,
                };

                let output: string;
                if (this.jobInfoPayload.input.webinaParams.score_only) {
                    // Score only

                    // The output should be the input ligand.
                    output = this.jobInfoPayload.input.pdbFiles.cmpd.contents.trim();

                    const splitStr = "Estimated Free Energy of Binding";
                    this.jobInfoPayload.output.scoreOnly =
                        splitStr + stdOut.trim().split(splitStr)[1];
                } else {
                    // Actual docking, get from file.

                    // Read the contents of the output file
                    output = (this as any).FS.readFile("/output.pdbqt", {
                        encoding: "utf8",
                    });
                }

                this.jobInfoPayload.output.output = output;

                // Clear the files to free up memory
                (this as any).FS.unlink("/receptor.pdbqt");
                (this as any).FS.unlink("/ligand.pdbqt");
                if (this.jobInfoPayload.input.webinaParams.docking) {
                    (this as any).FS.unlink("/output.pdbqt");
                }

                // Resolve the promise with the output
                this.doneCallbackFunc(this.jobInfoPayload);
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
        }).then((instance: any) => {
            // Probably not needed, but just in case
            return instance.ready;
        });
    }

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
        // Load webina dynamically.
        const WEBINA_MODULE = await dynamicImports.webina.module;
        const webinaInstance = await this._makeWebinaInstance(WEBINA_MODULE);

        // Unfortunately, you can only run callMain on a module once. To make a
        // module reusable, you'd have to export a wrapper around the main
        // function. It would be very complicated. Creating new instances of the
        // webina module is an option, but in practice that causes memory
        // problems after running about 100 times. I believe the only reasonable
        // solution is to ensure each inputBatch has only one item, and that
        // only one batch is running at a time. Note that each webina job can
        // use multiple processors, so this approach doesn't preclude that.
        // Basically, you can't turn the job into one that's embarassingly
        // parallel (running many webina instances on a single process). You
        // must run one webina instance on multiple processors.

        // Assert inputBatch has only one job.
        if (inputBatch.length !== 1) {
            throw new Error("Webina inputBatch can have only one item!")
        }

        const outputs: IJobInfo[] = [];
        for (const jobInfo of inputBatch) {
            const webinaOutput = await this._runJob(jobInfo, webinaInstance);
            outputs.push(webinaOutput);
        }

        return outputs;
    }

    /**
     * Run a single job.
     *
     * @param {IJobInfo} jobInfo         The job to run.
     * @param {*}        webinaInstance  The webina instance.
     * @returns {Promise<IJobInfo>}  The output job.
     */
    private async _runJob(
        jobInfo: IJobInfo,
        webinaInstance: any
    ): Promise<IJobInfo> {
        return new Promise((resolve) => {
            webinaInstance.setupRun(jobInfo, resolve);
            const argsList = [];

            for (const key in jobInfo.input.webinaParams) {
                const val = jobInfo.input.webinaParams[key];
                if (val === undefined) continue;
                if ([true, "true"].indexOf(val) !== -1) {
                    argsList.push(`--${key}`);
                } else if ([false, "false"].indexOf(val) !== -1) {
                    // do nothing
                } else {
                    argsList.push(`--${key}`);
                    argsList.push(val.toString());
                }
            }

            return webinaInstance.callMain(argsList);
        })
        // .then((resp: any) => {
        //     return resp;
        // // })
        // .catch((err) => {
        //     reject(err);
        //     console.error(err);
        //     throw err;
        // })
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    getTests(): ITest[] {
        // No tests for this simple plugin.
        return [];
    }
}
