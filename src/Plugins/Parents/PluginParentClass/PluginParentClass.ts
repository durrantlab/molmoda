/* eslint-disable jsdoc/check-tag-names */
// Evey plugin component class must inherit this one.
import { IMenuItem } from "@/UI/Navigation/Menu/Menu";
import { mixins } from "vue-class-component";
import {
    IContributorCredit,
    IInfoPayload,
    IPluginSetupInfo,
    ISoftwareCredit,
} from "../../PluginInterfaces";
import * as api from "@/Api";
import { registerLoadedPlugin } from "../../LoadedPlugins";
import { ITest, createTestCmdsIfTestSpecified } from "@/Testing/TestCmd";
import { HooksMixin } from "./Mixins/HooksMixin";
import { PopupMixin } from "./Mixins/PopupMixin";
import { JobMsgsMixin } from "./Mixins/JobMsgsMixin";
import { ValidationMixin } from "./Mixins/ValidationMixin";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
// import { TestingMixin } from "./Mixins/TestingMixin";
import { UserArgsMixin } from "./Mixins/UserArgsMixin";
import { registerHotkeys } from "@/Core/HotKeys";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import {
    doneInQueueStore,
    makeUniqJobId,
    startInQueueStore,
} from "@/Queue/QueueStore";
import { copyUserArgs } from "../UserInputUtils";
import { logGAEvent } from "@/Core/GoogleAnalytics";
import { delayForPopupOpenClose } from "@/Core/GlobalVars";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import { isAnyPopupOpen } from "@/UI/Layout/Popups/OpenPopupList";
import { ILoadMolParams } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/Types";
import { removeTerminalPunctuation } from "@/Core/Utils/StringUtils";
import { timeDiffDescription } from "@/Core/Utils/TimeUtils";
import { Tag } from "@/Plugins/Tags/Tags";

// export type RunJob = FileInfo[] | FileInfo | undefined | void;
// export type RunJobReturn = Promise<RunJob> | RunJob;
// export type RunJobReturn = Promise<void>;

const runningForAWhileTimers: { [key: string]: any } = {};

/**
 * PluginParentClass
 */
export abstract class PluginParentClass extends mixins(
    HooksMixin,
    PopupMixin,
    JobMsgsMixin,
    ValidationMixin,
    // TestingMixin,
    UserArgsMixin
) {
    /**
     * The menu path for this plugin (e.g., `["[3] molmoda", "[1] About"]` or
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
     * The title of the plugin. This is shown at the top of the plugin bar.
     *
     * @type {string}
     */
    abstract title: string;

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
     * A very short description of what the plugin does. This is shown at the
     * top of the plugin. Be brief.
     *
     * @type {string}
     */
    abstract intro: string;

    /**
     * An optional expanded introduction, also shown at the top of the plugin.
     * It should describe how the program does what it does. Be brief.
     *
     * @type {string}
     */
    details = "";

    /**
     * A list of user arguments. Note that `userArgDefaults` defines the default
     * user argument values (on popup), but it is not reactive. See it as an
     * unchangable template. Modify userArgs to change the user argument values
     * reactively.
     *
     * @type {UserArg[]}
     */
    abstract userArgDefaults: UserArg[];

    /**
     * A list of tags for the plugin. These are used when running MolModa in
     * different modes (e.g., visualization mode). Use Tag.All if the plugin
     * should appear in all categories.
     */
    abstract tags: Tag[];

    /**
     * The payload to send to the plugin component via the infoPayload property.
     *
     * @returns {IInfoPayload}  The info payload.
     */
    get infoPayload(): IInfoPayload {
        // check if this has details
        return {
            title: this.title,
            userArgs: this.userArgs,
            pluginId: this.pluginId,
            intro: this.intro || "",
            details: this.details,
            softwareCredits: this.softwareCredits,
            contributorCredits: this.contributorCredits,
        };
    }

    /**
     * The user arguments, created from `userArgDefaults`. This is reactive. You
     * should not define it on children.
     */
    userArgs: UserArg[] = [];

    /**
     * Optionally define a hotkey (keyboard shortcut) to trigger this plugin.
     * For example, "r". Note that molmoda maps "r" to "ctrl+r" and "command+r"
     * automatically, so no need to specify ctrl/command. If hotkey is not just
     * one letter (e.g., "backspace"), "ctrl+"" is not added. If a plugin has
     * multiple hotkeys, specify them as an array of strings.
     *
     * @type {string | string[]}
     */
    hotkey: string | string[] = "";

    /**
     * Some jobs are so trivial that there is no need to log them. These run in
     * the browser (not remotely or in docker). They occur immediately on the
     * main thread, without delay. Examples include undo/redo buttons. You must
     * explicitly set this to "false" to disable logging.
     *
     * @type {boolean}
     */
    logJob = true;

    /**
     * The message to show when all jobs have finished. It is a string or a
     * function. If the string is "", no message is shown. If the function
     * returns undefined, no message is shown.
     *
     * @type {string | Function}
     */
    msgOnJobsFinished: string | (() => string | undefined) = "";

    /**
     * If alwaysEnabled is set to true, this plugin will always load, even if
     * the user specifies one plugin using the "plugin" url parameter. Set to
     * true for core plugins that are not optional.
     *
     * @type {boolean}
     */
    alwaysEnabled = false;

    /**
     * By default, all jobs are shown in the job queue. You can change this
     * default behavior by setting showInQueue to false.
     *
     * @type {boolean}
     */
    showInQueue = true;

    /**
     * By default, the plugin will show a message if the job takes a long time
     * to run. You can disable this message by setting skipLongRunningJobMsg to
     * true.
     */
    skipLongRunningJobMsg = false;

    /**
     * Runs when the user first starts the plugin. Called when the user clicks
     * the plugin from the menu. Can also be called directly using the api
     * (advanced/rare use).
     *
     * @param {any} [payload]    Data to pass to the plugin. Probably only
     *                           useful when programmatically starting the
     *                           plugin without using the menu system. Optional.
     * @returns {Promise<void>}  Promise that resolves when the plugin is
     *                           finished starting.
     * @gooddefault
     * @document
     */
    public async onPluginStart(payload?: any): Promise<void> {
        console.trace();
        
        // Log plugin started
        logGAEvent(this.pluginId, "started");

        // Reset userArgs to defaults.
        this.userArgs = copyUserArgs(this.userArgDefaults);

        // Check if the plugin opening should be cancelled based on what the
        // onBeforePopupOpen hook returns.
        if (await this.onBeforePopupOpen(payload) === false) {
            return;
        }

        this.openPopup();

        // Wait a bit before firing onPopupOpen. This is to give the popup
        // time to open before the plugin starts doing stuff.
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve(undefined);
            }, delayForPopupOpenClose);
        });

        this.onPopupOpen();

        // Could set focus using $refs, but I think it will be easier just to
        // find the field with javascript.
        if (this.userArgs.length > 0) {
            const firstFieldId = this.userArgs[0].id;
            const queryStr = `#modal-${this.pluginId} #${firstFieldId}-${this.pluginId}-item`;
            const firstField = document.querySelector(queryStr);
            if (firstField) {
                (firstField as HTMLElement).focus();
            }
        }

        return;
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
     * @gooddefault
     * @document
     */
    public onPopupDone(): void | Promise<void> {
        this.submitJobs(this.userArgs);
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
    protected async submitJobs(
        parameterSets?: any[],
        numProcessorsPerJob = 1,
        delayBetweenJobsMS?: number
    ) {
        if (!this.skipLongRunningJobMsg) {
            if (runningForAWhileTimers[this.pluginId] !== undefined) {
                clearTimeout(runningForAWhileTimers[this.pluginId]);
            }
            runningForAWhileTimers[this.pluginId] = setTimeout(() => {
                api.messages.popupMessage(
                    "Job Running",
                    "Your job is currently running. Check the Jobs panel to monitor job progress.",
                    PopupVariant.Success
                );
            }, 5000);
        }

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

        // Log plugin started
        logGAEvent(this.pluginId, "jobSubmitted");

        // Run each of the parameter sets through the _runJobInBrowser function.
        let jobs = parameterSets.map((p: any) => {
            return this._runJobInBrowser(undefined, p);
        });

        // Remove any job that returns nothing.
        jobs = jobs.filter((j: any) => j !== undefined);

        // Add to job queue table. Also 1 processor, because running on main
        // thread.
        const jobId = makeUniqJobId(this.pluginId);
        if (this.showInQueue) {
            startInQueueStore(jobId, 1, () => {
                return;
            });
        }

        // Wait for promises to resolve.
        await Promise.all(jobs).catch((err: any) => {
            throw err;
        });

        // Remove from job queue table.
        if (this.showInQueue) {
            doneInQueueStore(jobId);
        }

        // Log plugin finished
        logGAEvent(this.pluginId, "jobFinished");

        if (!this.skipLongRunningJobMsg) {
            clearTimeout(runningForAWhileTimers[this.pluginId]);
            delete runningForAWhileTimers[this.pluginId];
            if (Object.keys(runningForAWhileTimers).length === 0) {
                api.messages.closePopupMessage();
            }
        }

        const msgToUse =
            typeof this.msgOnJobsFinished === "string"
                ? this.msgOnJobsFinished
                : this.msgOnJobsFinished();
        if (msgToUse !== "" && msgToUse !== undefined) {
            setTimeout(() => {
                // If this.msgOnJobsFinished is string...
                api.messages.popupMessage(
                    "Job Finished",
                    msgToUse,
                    PopupVariant.Success
                );
            }, delayForPopupOpenClose);
        }

        // const jobs: IJobInfoToEndpoint[] = parameterSets.map(
        //     (p: IJobInfoToEndpoint) => {
        //         return {
        //             commandName: this.pluginId,
        //             params: p,
        //             id: randomID(5),
        //             delayRun: delayBetweenJobsMS,
        //             numProcessors: numProcessorsPerJob,
        //             noResponse: !this.logJob,
        //         } as IJobInfoToEndpoint;
        //     }
        // );

        // JobQueue.submitJobs(jobs);
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
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    abstract runJobInBrowser(parameterSet: any): Promise<void>;

    /**
     * Wraps around runJob to log start/end messages. It is called by the job
     * queue system.
     *
     * @param {string} [jobId]         The job id to use (optional).
     * @param {any}    [parameterSet]  The same parameterSets submitted via the
     *                                 submitJobs function, but one at a time.
     *                                 Optional.
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    private async _runJobInBrowser(
        jobId?: string,
        parameterSet?: any
    ): Promise<void> {
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

        await this.runJobInBrowser(parameterSet);

        let endLogTxt = "";
        if (this.logJob) {
            endLogTxt = this.onEndJobLogMsg(this.pluginId);
            endLogTxt = removeTerminalPunctuation(endLogTxt);
        }

        // if (jobResultFiles !== undefined) {
        //     // It's a promise
        //     return jobResultFiles
        //         .then((files: FileInfo[] | FileInfo | void | undefined) => {
        //             if (files === undefined) {
        //                 files = [];
        //             }
        //             // If files is not array, make it one
        //             if (!Array.isArray(files)) {
        //                 files = [files];
        //             }

        //             if (this.logJob) {
        //                 endLogTxt +=
        //                     " " +
        //                     timeDiffDescription(
        //                         new Date().getTime(),
        //                         startTime
        //                     );
        //                 api.messages.log(endLogTxt, undefined, jobId);
        //             }

        //             return; //  files;
        //         })
        //         .catch((error: Error) => {
        //             throw error;
        //         });
        // } else if (this.logJob) {
        //     // Proabably returned void.
        // }

        endLogTxt += " " + timeDiffDescription(startTime, new Date().getTime());
        api.messages.log(endLogTxt, undefined, jobId);

        // It's an object or undefined
        // if (this.logJob) {
        //     endLogTxt +=
        //         " " + timeDiffDescription(new Date().getTime(), startTime);
        //     api.messages.log(endLogTxt, undefined, jobId);
        // }

        // Make it an array
        // return jobResultFiles;
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

    /**
     * Called by the menu to open the plugin. Can be called externally too. But
     * if you want to call a plugin programmatically with parameterws, use
     * pluginsApi.runPlugin.
     */
    public menuOpenPlugin(): void {
        // Could use `this.onPluginStart();`, but use api for
        // consistency's sake.
        const msg = this.checkPluginAllowed();
        if (msg !== null) {
            api.messages.popupError(msg);
        } else {
            api.plugins.runPlugin(this.pluginId);
        }
    }

    /** mounted function */
    async mounted() {
        // Do some quick validation
        this._validatePlugin(this.pluginId, this.intro, this.details);

        registerLoadedPlugin(this);

        // Add to menu and credits.
        this.$emit("onPluginSetup", {
            softwareCredits: this.softwareCredits,
            contributorCredits: this.contributorCredits,
            menuData: {
                path: this.menuPath,
                hotkey: this.hotkey,
                function: this.menuOpenPlugin,
                pluginId: this.pluginId,
                checkPluginAllowed: this.checkPluginAllowed,
            } as IMenuItem,
            pluginId: this.pluginId,
        } as IPluginSetupInfo);

        // Register the hotkey if any.
        if (this.hotkey !== "") {
            registerHotkeys(this.hotkey, this.pluginId, (e: KeyboardEvent) => {
                e.preventDefault();
                const msg = this.checkPluginAllowed();
                if (msg !== null) {
                    api.messages.popupError(msg);
                } else {
                    if (isAnyPopupOpen()) {
                        return;
                    }
                    api.plugins.runPlugin(this.pluginId);
                }
            });
        }

        this.userArgs = copyUserArgs(this.userArgDefaults);

        this.onMounted();

        await createTestCmdsIfTestSpecified(this);
    }

    /**
     * The runJobInBrowser() function receives a fileInfo object. Often, you
     * want to create a molecule from this object and add it to the main tree.
     * This is a helper function to do that.
     *
     * @param {ILoadMolParams} params              The parameters for loading
     *                                             the molecule.
     * @param {boolean}        [hideOnLoad=false]  Whether to make the molecule
     *                                             visible or not. Defaults to
     *                                             false.
     * @returns {Promise<void>}  A promise that resolves when the molecule is
     *                           added to the main tree.
     */
    protected addFileInfoToViewer(
        params: ILoadMolParams,
        hideOnLoad = false
    ): Promise<void> {
        return new TreeNodeList()
            .loadFromFileInfo(params)
            .then((newTreeNodeList) => {
                // Note: If loading molmoda file, newTreeNodeList will be
                // undefined.
                if (newTreeNodeList) {
                    newTreeNodeList.addToMainTree(this.pluginId);

                    if (hideOnLoad) {
                        newTreeNodeList.flattened.forEach((n) => {
                            n.visible = false;
                        });
                    }

                    return;
                }
                return;
            });
    }

    /**
     * Called when the user arguments change. Override this function to react
     * when the user arguments change. Access the arguments using this.userArgs.
     */
    onUserArgChange() {
        return;
    }

    /**
     * Makes the userArgs reactive. Do not overwrite this funciton. If you wish
     * to react when the user arguments change, use onUserArgChange instead.
     *
     * @param {UserArg[]} newUserArgs  The new userArgs.
     */
    onUserArgChanged(newUserArgs: UserArg[]) {
        this.userArgs = newUserArgs;
        this.onUserArgChange();
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {Promise<ITest[] | ITest>}  The selenium test command(s). If null,
     * skips test (rarely used).
     */
    abstract getTests(): Promise<ITest[] | ITest>;
}
