/* eslint-disable jsdoc/check-tag-names */
// Evey plugin component class must inherit this one.
import * as JobQueue from "@/Queue/JobQueue";
import { IMenuItem } from "@/UI/Navigation/Menu/Menu";
import { mixins } from "vue-class-component";
import {
    IContributorCredit,
    IPluginSetupInfo,
    ISoftwareCredit,
} from "../../PluginInterfaces";
import * as api from "@/Api";
import {
    randomID,
    removeTerminalPunctuation,
    timeDiffDescription,
} from "@/Core/Utils";
import { alwaysEnabledPlugins, loadedPlugins } from "../../LoadedPlugins";
import { createTestCmdsIfTestSpecified } from "@/Testing/ParentPluginTestFuncs";
import { HooksMixin } from "./Mixins/HooksMixin";
import { PopupMixin } from "./Mixins/PopupMixin";
import { JobMsgsMixin } from "./Mixins/JobMsgsMixin";
import { ValidationMixin } from "./Mixins/ValidationMixin";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { TestingMixin } from "./Mixins/TestingMixin";
import { UserArgsMixin } from "./Mixins/UserArgsMixin";
import { IJobInfoToEndpoint } from "@/Queue/Types/TypesToEndpoint";
import { IFileInfo } from "@/FileSystem/Types";
import { registerHotkeys } from "@/Core/HotKeys";

export type RunJob = IFileInfo[] | IFileInfo | undefined | void;
export type RunJobReturn = Promise<RunJob> | RunJob;

/**
 * PluginParentClass
 */
export abstract class PluginParentClass extends mixins(
    HooksMixin,
    PopupMixin,
    JobMsgsMixin,
    ValidationMixin,
    TestingMixin,
    UserArgsMixin
) {
    /**
     * The menu path for this plugin (e.g., `["[3] Biotite", "[1] About"]` or
     * `"File/Molecules/Import/[4] AlphaFold"`). Note that you can include a
     * priority (number) in brackets. The priority is stripped from the text,
     * but its value is used to order the menu item relative to others.
     *
     * The vast majority of plugins should be accessible from the menu, but set
     * `menuPath` to null if you want to create a menu-inaccessible plugin.
     *
     * @type {string[] | string | null}
     */
    abstract menuPath: string[] | string | null;

    /**
     * A list of software credits. If the plugin uses no third-party packages,
     * set this to `[]`.
     *
     * @type {ISoftwareCredit[]}
     */
    abstract softwareCredits: ISoftwareCredit[];

    /**
     * A list of people to credit.
     *
     * @type {IContributorCredit[]}
     */
    abstract contributorCredits: IContributorCredit[];

    /**
     * A unique id that defines the plugin. Must be lower case.
     *
     * @type {string}
     */
    abstract pluginId: string;

    /**
     * A list of user arguments. Note that `userArgs` defines the user
     * arguments, but it is not reactive. See it as an unchangable template. Use
     * `updateUserArgs` to programmatically change actual user-specified inputs.
     *
     * @type {FormElement[]}
     */
    abstract userArgs: FormElement[];

    /**
     * Optionally define a hotkey (keyboard shortcut) to trigger this plugin.
     * For example, "r". Note that biotite maps "r" to "ctrl+r" and "command+r"
     * automatically, so no need to specify ctrl/command.
     *
     * @type {string}
     */
    hotkey = "";

    /**
     * Some jobs are so trivial that there is no need to log them. These run in
     * the browser (not remotely or in docker). They occur immediately on the
     * main thread, without delay. Examples include undo/redo buttons. You must
     * explicitly set this to "false" to disable logging.
     *
     * @type {boolean}
     */
    logJob = true;

    // In some cases, must pass information to the plugin when it opens.
    // Typicaly when using the plugin outside the menu system.
    protected payload: any = undefined;

    // If set to true, this plugin will always load, even if the user specifies
    // one plugin using the "plugin" url parameter. Set to true for core plugins
    // that are not optional.
    protected alwaysEnabled = false;

    /**
     * Runs when the user first starts the plugin. Called when the user clicks
     * the plugin from the menu. Can also be called directly using the api
     * (advanced/rare use).
     *
     * @param {any} [payload]   Data to pass to the plugin. Probably only useful
     *                          when programmatically starting the plugin
     *                          without using the menu system. Optional.
     * @gooddefault
     * @document
     */
    public onPluginStart(payload?: any): void {
        // Children should not override this function! Use onPopupOpen instead.
        this.payload = payload;

        // Check if the plugin opening should be cancelled based on what the
        // onBeforePopupOpen hook returns.
        let continueOpen = this.onBeforePopupOpen() as
            | boolean
            | Promise<boolean>
            | undefined;
        if (continueOpen === undefined) {
            // Return must have been void.
            continueOpen = true;
        }

        // If a boolean, convert it to Promise<boolean>
        const continuePromise =
            typeof continueOpen === "boolean"
                ? Promise.resolve(continueOpen)
                : continueOpen; // Already a promise

        // Continue to open plugin only if promise resolves true.
        continuePromise
            .then((continueOpen: boolean) => {
                if (continueOpen === false) {
                    return;
                }
                this.openPopup();
                setTimeout(() => {
                    this.onPopupOpen();
                }, 1000);
                return;
            })
            .catch((err: any) => {
                console.error(err);
            });
    }

    /**
     * Runs when the user clicks the plugin action button (e.g., "Load"). You
     * likely want to call the `submitJobs` function from `onPopupDone` to
     * submit job(s) to the queue system.
     *
     * The default version submits the user arguments as a single job. Override
     * it if you want to modify those arguments before submitting to the queue,
     * or if you want to submit multiple jobs to the queue.
     *
     * @param {IUserArg[]} userArgs  The user arguments.
     * @gooddefault
     * @document
     */
    public onPopupDone(userArgs: IUserArg[]): void {
        this.submitJobs([userArgs]);
    }

    /**
     * Submits multiple jobs to the queue system. `submitJobs` is typically
     * called from the `onPopupDone` function (after the user presses the
     * popup's action button).
     *
     * @param {any[]}  [parameterSets]          A list of parameters, one per
     *                                          job. Even if your plugin submits
     *                                          only one job (most common case),
     *                                          you must still wrap the
     *                                          parameters in an array.
     *                                          Optional.
     * @param {number} [numProcessorsPerJob=1]  The number of processors to use
     *                                          per job. Defaults to 1.
     * @param {number} [delayBetweenJobsMS]       The number of milliseconds to
     *                                          wait between running jobs. A
     *                                          modal appears during this time
     *                                          giving the user the opportunity
     *                                          to cancel all jobs. Optional.
     * @helper
     * @document
     */
    protected submitJobs(
        parameterSets?: any[],
        numProcessorsPerJob = 1,
        delayBetweenJobsMS?: number
    ) {
        if (parameterSets === undefined) {
            parameterSets = [undefined];
        }
        if (parameterSets.length === undefined) {
            throw new Error(
                `parameterSets must be an array. If your plugin (${this.pluginId}) only submits one job, wrap it in [].`
            );
        }
        if (parameterSets.length === 0) {
            parameterSets = [undefined];
        }

        const jobs: IJobInfoToEndpoint[] = parameterSets.map(
            (p: IJobInfoToEndpoint) => {
                return {
                    commandName: this.pluginId,
                    params: p,
                    id: randomID(5),
                    delayRun: delayBetweenJobsMS,
                    numProcessors: numProcessorsPerJob,
                    noResponse: !this.logJob,
                } as IJobInfoToEndpoint;
            }
        );

        for (const job of jobs) {
            let logTxt = this.onSubmitJobLogMsg(this.pluginId);
            logTxt = removeTerminalPunctuation(logTxt);
            if (this.logJob) {
                api.messages.log(logTxt, undefined, job.id);
            }
        }

        JobQueue.submitJobs(jobs);
    }

    /**
     * Each plugin is associated with specific jobs (calculations). Most of
     * these will run in the browser itself, rather than on a remote computing
     * resource. This function runs a single job in the browser (or calls the
     * JavaScript/WASM libraries to run the job). The job-queue system calls
     * `runJob` directly.
     *
     * @param {any} [parameterSet]  One of the parameterSets items submitted via
     *                              the `submitJobs` function. Optional.
     * @returns {RunJobReturn}  A promise that resolves a result (object) when
     *     the job is done. The object maps a filename to file content, with the
     *     type determined by the filename (key) extension. You can also return
     *     such an object directly, without using a promise, if the job is
     *     synchronous. Return void or undefined if there's nothing to return.
     */
    abstract runJobInBrowser(parameterSet: any): RunJobReturn;

    /**
     * Wraps around runJob to log start/end messages. It is called by the job
     * queue system.
     *
     * @param {string} [jobId]         The job id to use (optional).
     * @param {any}    [parameterSet]  The same parameterSets submitted via the
     *                                 submitJobs function, but one at a time.
     *                                 Optional.
     * @returns {RunJobReturn}  A promise that resolves when the job is done,
     *     with the result (string), or a string itself (if the job is
     *     synchronous), or undefined if there's nothing to return (so user not
     *     required to use).
     */
    private _runJobInBrowser(jobId?: string, parameterSet?: any): RunJobReturn {
        if (this.runJobInBrowser === null) {
            // Below won't ever happen (wouldn't pass validation), but makes it
            // easy to avoid typescript error.
            throw new Error(
                `Plugin ${this.pluginId} has no runJobInBrowser function.`
            );
        }

        // Log the job if appropriate.
        if (this.logJob) {
            let startLogTxt = this.onStartJobLogMsg(this.pluginId);
            startLogTxt = removeTerminalPunctuation(startLogTxt);
            api.messages.log(startLogTxt, parameterSet, jobId);
        }

        const startTime = new Date().getTime();

        const jobResultFiles = this.runJobInBrowser(
            parameterSet
        ) as RunJobReturn;

        let endLogTxt = "";
        if (this.logJob) {
            endLogTxt = this.onEndJobLogMsg(this.pluginId);
            endLogTxt = removeTerminalPunctuation(endLogTxt);
        }

        // TODO: Would be nice if there were a separate function (perhaps in
        // serparate file with RunJobReturn defs) that would convert all
        // possible outputs into Promise<IFileInfo[]>. Would also remove any
        // undefines. You might use this in InBrowserEndpoint.ts or thereabouts
        // too, so would be good to reuse code. Make this cleaner.

        // It's a promise
        if (jobResultFiles instanceof Promise) {
            return jobResultFiles
                .then((files: IFileInfo[] | IFileInfo | void | undefined) => {
                    if (files === undefined) {
                        files = [];
                    }
                    // If files is not array, make it one
                    if (!Array.isArray(files)) {
                        files = [files];
                    }

                    if (this.logJob) {
                        endLogTxt +=
                            " " +
                            timeDiffDescription(
                                new Date().getTime(),
                                startTime
                            );
                        api.messages.log(endLogTxt, undefined, jobId);
                    }

                    return files;
                })
                .catch((error: Error) => {
                    throw error;
                });
        }

        // It's an object or undefined
        if (this.logJob) {
            endLogTxt +=
                " " + timeDiffDescription(new Date().getTime(), startTime);
            api.messages.log(endLogTxt, undefined, jobId);
        }

        // Make it an array
        return jobResultFiles;
    }

    /**
     * Called when the plugin is mounted. No plugin should define its own
     * `mounted()` function. Use `onMounted` instead.
     *
     * @document
     */
    protected onMounted(): void {
        // can be optionally overridden.
        return;
    }

    /** mounted function */
    mounted() {
        // Do some quick validation
        this._validatePlugin(this.pluginId);

        loadedPlugins[this.pluginId] = this;
        if (this.alwaysEnabled) {
            alwaysEnabledPlugins.push(this.pluginId);
        }

        // Add to menu and credits.
        this.$emit("onPluginSetup", {
            softwareCredits: this.softwareCredits,
            contributorCredits: this.contributorCredits,
            menuData: {
                path: this.menuPath,
                hotkey: this.hotkey,
                function: () => {
                    // Could use `this.onPluginStart();`, but use api for
                    // consistency's sake.
                    const msg = this.checkPluginAllowed();
                    if (msg !== null) {
                        api.messages.popupError(msg);
                    } else {
                        api.plugins.runPlugin(this.pluginId);
                    }
                },
            } as IMenuItem,
            pluginId: this.pluginId,
        } as IPluginSetupInfo);

        // Register with job queue system
        api.hooks.onJobQueueCommand(
            this.pluginId,
            this._runJobInBrowser.bind(this)
        );

        // Register the hotkey if any.
        if (this.hotkey !== "") {
            // TODO: Good to access registerHotkeys through api for
            // consistency's sake?

            // command+ in hotkey? Throw error.
            if (this.hotkey.indexOf("+") !== -1) {
                const msg = `Plugin ${this.pluginId} has a hotkey with "+" in it. This is not allowed. Use only the letter.`;
                throw new Error(msg);
            }

            const key = this.hotkey.toLowerCase();
            registerHotkeys(`ctrl+${key}, command+${key}`, (e: KeyboardEvent) => {
                e.preventDefault()
                const msg = this.checkPluginAllowed();
                if (msg !== null) {
                    api.messages.popupError(msg);
                } else {
                    api.plugins.runPlugin(this.pluginId);
                }

            });
        }

        this.onMounted();

        createTestCmdsIfTestSpecified(this);
    }
}
