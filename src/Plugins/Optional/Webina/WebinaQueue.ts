import { QueueParent } from "@/Queue/QueueParent";
import { IJobInfo } from "@/Queue/QueueTypes";
import { dynamicImports } from "@/Core/DynamicImports";
import { ITest } from "@/Testing/TestCmd";
import { setTempErrorMsg } from "@/Plugins/Core/ErrorReporting/ErrorReporting";
import { USE_YURI_METHOD } from "./WebinaConsts";

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
        let fileCheckingTimer: any = null;

        let _doneCallbackFunc: (jobInfo: IJobInfo) => void;
        let jobInfoPayload = {} as IJobInfo;

        // https://emscripten.org/docs/api_reference/module.html

        return WEBINA_MODULE({
            noExitRuntime: USE_YURI_METHOD,

            noInitialRun: true,

            // stderr will log when any file is read.
            logReadFiles: true,

            // onRuntimeInitialized() { console.log("Runtime initialized"); },

            // preInit() { console.log("Pre-init"); },

            // You must manually set these two before running the module.
            // jobInfoPayload: {} as IJobInfo,
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
                jobInfos: IJobInfo[],
                doneCallbackFunc: (jobInfo: IJobInfo) => void
            ) {
                // jobInfoPayload = jobInfo;  // TODO: WHAT IS THIS?
                this.doneCallbackFunc = doneCallbackFunc;
                _doneCallbackFunc = doneCallbackFunc;

                // Save the pdbqt files to the virtual filesystem.
                const filesAlreadySaved = new Set<string>();
                for (const jobInfo of jobInfos) {
                    const ligandPDBQTFilename =
                        jobInfo.input.pdbFiles.cmpd.name;
                    if (!filesAlreadySaved.has(ligandPDBQTFilename)) {
                        const ligandPDBQTContents =
                            jobInfo.input.pdbFiles.cmpd.contents;
                        this.FS.writeFile(
                            ligandPDBQTFilename,
                            ligandPDBQTContents
                        );
                        filesAlreadySaved.add(ligandPDBQTFilename);
                    }
                    const receptorPDBQTFilename =
                        jobInfo.input.pdbFiles.prot.name;
                    if (!filesAlreadySaved.has(receptorPDBQTFilename)) {
                        const receptorPDBQTContents =
                            jobInfo.input.pdbFiles.prot.contents;
                        this.FS.writeFile(
                            receptorPDBQTFilename,
                            receptorPDBQTContents
                        );
                        filesAlreadySaved.add(receptorPDBQTFilename);
                    }
                }

                // Check for out files every 500ms
                if (fileCheckingTimer) {
                    clearInterval(fileCheckingTimer);
                }
                fileCheckingTimer = setInterval(() => {
                    // Get all the *.out files
                    const outFiles = this.FS.readdir("/").filter((filename: string) =>
                        filename.endsWith(".out")
                    );

                    if (outFiles.length > 0) {
                        // Check for the output file
                        debugger
                        // clearInterval(fileCheckingTimer);
                        // this.onExit(0);
                    }
                }, 500);

                // Get the PDBQT contents from this.jobInfoPayload, which
                // must be manually before running.

                // const ligandPDBQT = jobInfoPayload.input.pdbFiles.cmpd.contents;
                // const receptorPDBQT =
                //     jobInfoPayload.input.pdbFiles.prot.contents;

                // // Save the contents of the files to the virtual
                // // file system
                // this.FS.writeFile("/receptor.pdbqt", receptorPDBQT);
                // this.FS.writeFile("/ligand.pdbqt", ligandPDBQT);
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
                debugger;
                // Update with output
                jobInfoPayload.output = {
                    std: std.trim(),
                    stdOut: stdOut.trim(),
                    stdErr: stdErr.trim(),
                    time: performance.now() - startTime,
                };

                let output: string;
                if (jobInfoPayload.input.webinaParams.score_only) {
                    // Score only

                    // The output should be the input ligand.
                    output = jobInfoPayload.input.pdbFiles.cmpd.contents.trim();

                    const splitStr = "Estimated Free Energy of Binding";
                    jobInfoPayload.output.scoreOnly =
                        splitStr + stdOut.trim().split(splitStr)[1];
                } else {
                    // Actual docking, get from file.

                    // Read the contents of the output file
                    output = (this as any).FS.readFile("/output.pdbqt", {
                        encoding: "utf8",
                    });
                }

                jobInfoPayload.output.output = output;

                // Clear the files to free up memory
                (this as any).FS.unlink("/receptor.pdbqt");
                (this as any).FS.unlink("/ligand.pdbqt");
                if (jobInfoPayload.input.webinaParams.docking) {
                    (this as any).FS.unlink("/output.pdbqt");
                }

                // Resolve the promise with the output
                this.doneCallbackFunc(jobInfoPayload);
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
                // Strangly, the warning "WARNING: At low exhaustiveness, it may
                // be impossible to utilize all CPUs." registers as an error,
                // but it shouldn't be one.
                if (text.toLowerCase().indexOf("warning") !== -1) {
                    stdOut += text + "\n";
                    std += text + "\n";
                    return;
                }

                console.log("ERROR:" + text);
                stdErr += text + "\n";
                std += text + "\n";

                // Update with output
                jobInfoPayload.output = {
                    std: std.trim(),
                    stdOut: stdOut.trim(),
                    stdErr: stdErr.trim(),
                    time: performance.now() - startTime,
                    output: "{{ERROR}}",
                };

                setTempErrorMsg(
                    `Could not dock compound: ${jobInfoPayload.input.inputNodeTitle} (skipped). There are many possible causes, including: (1) docking compounds with atoms that are not in the AutoDock Vina forcefield (e.g., boron), (2) docking physically impossible compounds (e.g., a single fluorine atom bound to two or more other atoms), (3) docking fragmented compounds (e.g., salts), (4) docking very large compounds, and (5) using a computer with insufficient memory.`
                );

                // Below is just dummy. Replace with useful values
                _doneCallbackFunc(jobInfoPayload);
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
        let WEBINA_MODULE = await dynamicImports.webina.module;
        let webinaInstance = await this._makeWebinaInstance(WEBINA_MODULE);

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
        if (inputBatch.length !== 1 && USE_YURI_METHOD) {
            throw new Error("Webina inputBatch can have only one item!");
        }

        const outputs: IJobInfo[] = [];
        // for (const jobInfo of inputBatch) {
        //     const webinaOutput = await this._runJob(jobInfo, webinaInstance);
        //     outputs.push(webinaOutput);
        // }

        const webinaOutput = await this._runJob(inputBatch, webinaInstance);

        webinaInstance.wasmMemory = null;
        webinaInstance = null;
        WEBINA_MODULE = null;

        return outputs;
    }

    private _viaCWrap(webinaInstance: any, argsList: string[]) {
        const webinaJSFunc = webinaInstance.cwrap(
            "vina_main_wrapper",
            // return type
            null,
            // parameters. Num params, and a pointer to the array of
            // pointers
            ["number", "number"]
        );

        // Add "vina" to the beginning of the argsList
        argsList.unshift("vina");

        const argsPointers = argsList.map((arg) =>
            webinaInstance.allocateUTF8(arg, "i8", webinaInstance.ALLOC_NORMAL)
        );

        // Allocate memory for the array of pointers
        const argsArrayPtr = webinaInstance._malloc(argsPointers.length * 4);

        argsPointers.forEach((argPtr, index) => {
            // Set the pointers in the allocated array
            webinaInstance.setValue(argsArrayPtr + index * 4, argPtr, "i32");
        });

        console.warn(
            "This never seems to exit... Also blocks main thread, and I'm not sure it respects nproc"
        );
        webinaJSFunc(argsList.length, argsArrayPtr);

        // Free the allocated memory if necessary
        argsPointers.forEach((argPtr) => webinaInstance._free(argPtr));
        webinaInstance._free(argsArrayPtr);

        const output = (this as any).FS.readFile("/output.pdbqt", {
            encoding: "utf8",
        });
    }

    /**
     * Run a single job.
     *
     * @param {IJobInfo} jobInfo         The job to run.
     * @param {*}        webinaInstance  The webina instance.
     * @returns {Promise<IJobInfo>}  The output job.
     */
    private async _runJob(
        jobInfos: IJobInfo[],
        webinaInstance: any
    ): Promise<IJobInfo> {
        return new Promise((resolve) => {
            webinaInstance.setupRun(jobInfos, resolve);
            const argsList: string[] = [];

            // All the parameters are the same (except for receptors), so just
            // get the first one.
            const firstJobInfo = jobInfos[0];
            for (const key in firstJobInfo.input.webinaParams) {
                const val = firstJobInfo.input.webinaParams[key];
                if (val === undefined) {
                    continue;
                }
                if ([true, "true"].indexOf(val) !== -1) {
                    argsList.push(`--${key}`);
                } else if ([false, "false"].indexOf(val) !== -1) {
                    // do nothing
                } else {
                    argsList.push(`--${key}`);
                    argsList.push(val.toString());
                }
            }

            if (USE_YURI_METHOD) {
                this._viaCWrap(webinaInstance, argsList);
                // STOP HERE FOR TESTING
                debugger;
            } else {
                debugger;
                // Rename --receptor and --ligand to --receptors and --ligands
                const receptorIdx = argsList.indexOf("--receptor");
                if (receptorIdx !== -1) {
                    argsList[receptorIdx] = "--receptors";
                }
                const ligandIdx = argsList.indexOf("--ligand");
                if (ligandIdx !== -1) {
                    argsList[ligandIdx] = "--ligands";
                }

                // Get all the unique receptors and ligands, avoiding
                // redundancies but preserving order.
                const receptorFilenames = jobInfos
                    .map((jobInfo) => jobInfo.input.pdbFiles.prot.name)
                    .filter(
                        (value, index, self) => self.indexOf(value) === index
                    );
                const ligandFilenames = jobInfos
                    .map((jobInfo) => jobInfo.input.pdbFiles.cmpd.name)
                    .filter(
                        (value, index, self) => self.indexOf(value) === index
                    );

                // Replace receptor values with value,value
                const receptorsIdx = argsList.indexOf("--receptors");
                if (receptorsIdx !== -1) {
                    argsList[receptorsIdx + 1] = receptorFilenames.join(",");
                }

                // Same with ligands
                const ligandsIdx = argsList.indexOf("--ligands");
                if (ligandsIdx !== -1) {
                    argsList[ligandsIdx + 1] = ligandFilenames.join(",");
                }

                // remove --out and its value (will be generated by webina wasm binary)
                const outIdx = argsList.indexOf("--out");
                if (outIdx !== -1) {
                    argsList.splice(outIdx, 2);
                }

                return webinaInstance.callMain(argsList);
            }
        });
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
    async getTests(): Promise<ITest[]> {
        // No tests for this simple plugin.
        return [];
    }
}
