import { QueueParent } from "@/Queue/QueueParent";
import { IJobInfo } from "@/Queue/QueueTypes";
import { dynamicImports } from "@/Core/DynamicImports";
import { ITest } from "@/Testing/TestInterfaces";
import { messagesApi } from "@/Api/Messages";
import { prepForErrorCustomMsg } from "./WebinaErrors";

/**
 * A calculate mol props queue.
 */
export class WebinaQueue extends QueueParent {
    private _jobCounter = 0;

    // Tracks the currently-running Emscripten instance so cancellation can
    // reach into the WASM runtime and terminate its pthread workers. Webina
    // is compiled with pthreads, which means the Emscripten module spawns
    // dedicated Web Workers for parallel docking. Calling abort() on the
    // main thread does NOT terminate those workers — we must explicitly
    // terminate them via Module.PThread.
    private _activeWebinaInstance: any = null;

    /**
     * Forcibly terminates all pthread workers spawned by a Webina Emscripten
     * instance. Without this, cancelling a docking run leaves the underlying
     * Web Workers running in the background until they finish their current
     * task — wasting CPU and memory long after the user has cancelled.
     *
     * Defends against multiple Emscripten layouts (PThread.terminateAllThreads,
     * PThread.runningWorkers, PThread.unusedWorkers) because the exact shape
     * varies by Emscripten version.
     *
     * @param {any} instance  The Emscripten module instance to tear down.
     */
    private _terminatePthreadWorkers(instance: any): void {
        if (!instance) return;
        const pthread = instance.PThread;
        if (!pthread) return;

        // Preferred path (modern Emscripten): one call that handles
        // bookkeeping for running and unused workers.
        if (typeof pthread.terminateAllThreads === "function") {
            try {
                pthread.terminateAllThreads();
                return;
            } catch {
                // Fall through to manual termination if the helper throws
                // (e.g. because the runtime is already partially torn down).
            }
        }

        // Fallback: walk the worker pools directly. Older Emscripten builds
        // expose runningWorkers and unusedWorkers as plain arrays.
        const pools: any[][] = [
            pthread.runningWorkers,
            pthread.unusedWorkers,
            pthread.pthreads,
        ].filter((p) => Array.isArray(p));

        for (const pool of pools) {
            for (const worker of pool) {
                try {
                    if (worker && typeof worker.terminate === "function") {
                        worker.terminate();
                    }
                } catch {
                    // Ignore individual termination failures; keep going so
                    // we kill as many workers as possible.
                }
            }
            pool.length = 0;
        }
    }
    
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
        let _onQueueDoneCallbackFunc: (webinaOuts: string[]) => void;
        let _onJobDoneCallbackFunc: (webinaOut: any, jobIndex: number) => void;
        // Capture queue reference so the polling-timer callback (which runs
        // with `this` bound to the Emscripten module) can still consult
        // queue-level cancellation state and reach the worker-termination
        // helper.
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const queueRef = this;

        // const jobInfoPayload = {} as IJobInfo; // TODO: Eventually, not const

        // https://emscripten.org/docs/api_reference/module.html

        const allOutputs: any[] = [];
        let allJobInfos: (IJobInfo | undefined)[] = [];

        // Tracks whether cancellation has already been handled for this run so
        // we don't resolve the promise twice or terminate workers more than
        // once.
        let cancellationHandled = false;

        /**
         * Updates the progress by one job.
         */
        const updateProgressByOneJob = () => {
            this._jobCounter++;
            this._onProgress(this._jobCounter / this._numTotalJobs);
        }

        return WEBINA_MODULE({
            noInitialRun: true,

            // stderr will log when any file is read.
            logReadFiles: true,

            // onRuntimeInitialized() { console.log("Runtime initialized"); },

            // preInit() { console.log("Pre-init"); },

            /**
             * Runs every 250ms while a batch is docking. Two jobs: (1) drain
             * any newly-completed *.out files into the queue's output list,
             * and (2) act as the cancellation polling site. The pthread
             * termination happens here because this is the only main-thread
             * code that runs while callMain() is blocking.
             */
            processCompleteOutFiles: function () {
                // Cancellation check first. We do the heavy lifting here
                // (terminating workers, resolving the promise) and let the
                // surrounding callMain unwind on its own.
                if (queueRef.isCancelling && !cancellationHandled) {
                    cancellationHandled = true;
                    clearInterval(fileCheckingTimer);

                    // Kill the pthread workers FIRST, before doing anything
                    // else. This is the whole point of the cancel feature
                    // working correctly — without this the workers keep
                    // grinding even after we resolve the queue promise.
                    queueRef._terminatePthreadWorkers(this);

                    // Now abort the main-thread runtime to unwind callMain.
                    try {
                        if (typeof (this as any).abort === "function") {
                            (this as any).abort("cancelled by user");
                        }
                    } catch {
                        // abort() throws by design; swallow.
                    }

                    _onQueueDoneCallbackFunc(allOutputs);
                    return;
                }

                // Get all the *.out files
                const outFiles = this.FS.readdir("/").filter(
                    (filename: string) => filename.endsWith(".out")
                );

                if (outFiles.length > 0) {
                    for (const outFilename of outFiles) {
                        const idx = parseInt(outFilename.split("--")[0]);

                        const jobInfoPayload = allJobInfos[idx] as IJobInfo;

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
                            output =
                                jobInfoPayload.input.pdbFiles.cmpd.contents.trim();

                            const splitStr = "Estimated Free Energy of Binding";
                            jobInfoPayload.output.scoreOnly =
                                splitStr + stdOut.trim().split(splitStr)[1];
                        } else {
                            // Actual docking, get from file.

                            // Read the contents of the output file
                            output = this.FS.readFile(outFilename, {
                                encoding: "utf8",
                            });
                        }

                        jobInfoPayload.output.output = output;

                        // Clear the output to free up memory (note that
                        // receptor ligands cleared up at end, see onExit).
                        (this as any).FS.unlink(outFilename);

                        _onJobDoneCallbackFunc(jobInfoPayload.output, idx);

                        allOutputs.push(jobInfoPayload);
                        allJobInfos[idx] = undefined; // Done with this jobinfo
                        updateProgressByOneJob();
                    }

                    // Reset for next calculation
                    std = "";
                    stdOut = "";
                    stdErr = "";
                }
            },

            /**
             * A function that runs before the program starts.
             *
             * @param {IJobInfo[]} jobInfos   The job infos.
             * @param {Function} onQueueDone  The callback function to call when
             *                                the job is done.
             * @param {Function} onJobDone    The callback function to call when
             *                                the job is done.
             */
            setupRun: function (
                jobInfos: IJobInfo[],
                onQueueDone: () => void,
                onJobDone: (webinaOut: any, jobIndex: number) => void
            ) {
                allJobInfos = [...jobInfos];

                _onQueueDoneCallbackFunc = onQueueDone;
                _onJobDoneCallbackFunc = onJobDone;

                this.processCompleteOutFiles =
                    this.processCompleteOutFiles.bind(this);

                // Save the pdbqt files to the virtual filesystem.
                const filesAlreadySaved = new Set<string>();
                const receptorFilenames: string[] = [];
                const ligandFilenames: string[] = [];
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
                        ligandFilenames.push(ligandPDBQTFilename);
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
                        receptorFilenames.push(receptorPDBQTFilename);
                        filesAlreadySaved.add(receptorPDBQTFilename);
                    }
                }

                // Save the receptor and ligand filenames to the virtual
                // filesystem.
                this.FS.writeFile(
                    "/receptor_list.txt",
                    receptorFilenames.join("\n")
                );
                this.FS.writeFile(
                    "/ligand_list.txt",
                    ligandFilenames.join("\n")
                );

                // Check for out files every 500ms
                if (fileCheckingTimer) {
                    clearInterval(fileCheckingTimer);
                }
                fileCheckingTimer = setInterval(
                    this.processCompleteOutFiles,
                    // Assuming will never dock more than 4 per second.
                    250
                );

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
                // If we already handled cancellation via the polling timer,
                // the queue promise has been resolved and the runtime is
                // being torn down — don't double-process.
                if (cancellationHandled) {
                    // Pthread workers and the promise were handled in the
                    // polling timer. Just clean up the virtual filesystem if
                    // still accessible.
                    try {
                        const allFiles = this.FS.readdir("/");
                        for (const filename of allFiles) {
                            if (
                                filename.endsWith(".pdbqt") ||
                                filename.endsWith(".txt") ||
                                filename.endsWith(".out")
                            ) {
                                this.FS.unlink(filename);
                            }
                        }
                    } catch {
                        // Filesystem may already be torn down; ignore.
                    }
                    clearInterval(fileCheckingTimer);
                    return;
                }

                this.processCompleteOutFiles();

                // Delete any files that end in pdbqt or txt. Now cleaning up.
                const allFiles = this.FS.readdir("/");
                for (const filename of allFiles) {
                    if (
                        filename.endsWith(".pdbqt") ||
                        filename.endsWith(".txt")
                    ) {
                        this.FS.unlink(filename);
                    }
                }

                // Stop the timer that checks for output files
                clearInterval(fileCheckingTimer);

                // Resolve the promise with the output
                _onQueueDoneCallbackFunc(allOutputs);
            },

            // Monitor stdout and stderr output

            /**
             * A function that runs when stdout is written to.
             *
             * @param {string} text  The text written to stdout.
             */
            print(text: string) {
                // Suppress stdout during cancellation. Don't throw — the
                // polling timer handles termination cleanly.
                if (queueRef.isCancelling) {
                    return;
                }

                // Keep only ones that start with ERROR RUN:
                if (!text.startsWith("ERROR RUN:")) {
                    console.log(text);
                    stdOut += text + "\n";
                    std += text + "\n";
                    return;
                }

                // It's an error.
                const jobIdx = parseInt(text.split("ERROR RUN: ")[1].trim());
                const jobInfoPayload = allJobInfos[jobIdx] as IJobInfo;

                if (jobInfoPayload === undefined) {
                    return;
                }

                // Update with output
                jobInfoPayload.output = {
                    std: std.trim(),
                    stdOut: stdOut.trim(),
                    stdErr: stdErr.trim(),
                    time: performance.now() - startTime,
                    output: "{{ERROR}}",
                };

                prepForErrorCustomMsg(jobInfoPayload.input.inputNodeTitle);

                // Below is just dummy. Replace with useful values
                _onJobDoneCallbackFunc(jobInfoPayload.output, jobIdx);
                allOutputs.push(jobInfoPayload);
                allJobInfos[jobIdx] = undefined;
            },

            /**
             * A function that runs when stderr is written to.
             *
             * @param {string} text  The text written to stderr.
             */
            printErr(text: string) {
                // Suppress stderr during cancellation to avoid spurious
                // error popups from runtime teardown noise.
                if (queueRef.isCancelling) {
                    return;
                }

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

                // This is probably a catastrophic error that effects the entire
                // job, not a specific protein/receptor (which is handled via
                // print above).
                messagesApi.popupError(
                    `An error occurred during docking. The job likely aborted. You might try clearing your cache or running in incognito mode. ${text}`
                );
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
        void procs; // Not used in this implementation, but part of the interface
        
        // Honor cancellation requested before this batch even begins.
        if (this.isCancelling) {
            return [];
        }

        // Load webina dynamically.
        let WEBINA_MODULE = await dynamicImports.webina.module;
        let webinaInstance = await this._makeWebinaInstance(WEBINA_MODULE);

        // Expose the active instance so cancellation paths outside the
        // Emscripten callbacks (e.g. future external aborts) can reach it.
        this._activeWebinaInstance = webinaInstance;

        const onJobDone = (this as WebinaQueue)._callbacks?.onJobDone;

        const argsList = this._makeArgList(inputBatch);
        // const onQueueDoneFunc = this._callbacks.onQueueDone;

        console.log(argsList);

        const outputs = await new Promise((resolve) => {
            webinaInstance.setupRun(inputBatch, resolve, onJobDone);
            try {
                webinaInstance.callMain(argsList);
            } catch (e) {
                // callMain throws when we abort the runtime. The polling
                // timer has already resolved the promise and terminated the
                // pthread workers; just swallow the abort exception.
                if (this.isCancelling) {
                    // Promise was already resolved by the polling timer;
                    // this resolve() is a no-op safeguard.
                    resolve([] as any);
                } else {
                    throw e;
                }
            }
        });

        // Belt-and-suspenders: if cancellation happened, make sure no
        // pthread workers survived the abort. This is a no-op in the happy
        // path because the polling timer already terminated them.
        if (this.isCancelling) {
            this._terminatePthreadWorkers(webinaInstance);
        }

        webinaInstance.wasmMemory = null;
        webinaInstance = null;
        WEBINA_MODULE = null;
        this._activeWebinaInstance = null;

        return outputs as IJobInfo[];
    }

    /**
     * Make the argument list for the webina wasm binary.
     *
     * @param {IJobInfo[]} jobInfos  The job infos.
     * @returns {string[]}  The argument list.
     */
    private _makeArgList(jobInfos: IJobInfo[]): string[] {
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

        // Remove --receptor and --ligand (and value)
        const receptorIdx = argsList.indexOf("--receptor");
        if (receptorIdx !== -1) {
            argsList.splice(receptorIdx, 2);
        }
        const ligandIdx = argsList.indexOf("--ligand");
        if (ligandIdx !== -1) {
            argsList.splice(ligandIdx, 2);
        }

        // remove --out and its value (will be generated by webina wasm binary)
        const outIdx = argsList.indexOf("--out");
        if (outIdx !== -1) {
            argsList.splice(outIdx, 2);
        }

        return argsList;
    }

    // /**
    //  * Run a single job.
    //  *
    //  * @param {IJobInfo} jobInfo         The job to run.
    //  * @param {*}        webinaInstance  The webina instance.
    //  * @returns {Promise<IJobInfo>}  The output job.
    //  */
    // private async _runJob(
    //     jobInfos: IJobInfo[],
    //     webinaInstance: any
    // ): Promise<IJobInfo> {
    //     const onJobDone = (this as WebinaQueue)._callbacks?.onJobDone;

    //     const argsList = this._makeArgList(jobInfos);
    //     // const onQueueDoneFunc = this._callbacks.onQueueDone;
    //     await new Promise((resolve) => {
    //         webinaInstance.setupRun(jobInfos, resolve, onJobDone);
    //         return webinaInstance.callMain(argsList);
    //     })

    //     return jobInfos[0];
    // }

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
