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
import { IJobInfo } from "@/Queue/Definitions";

export type RunJobReturn = Promise<any> | string | void | undefined;

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
    protected onPopupDone(userArgs: IUserArg[]): void {
        this.submitJobs([userArgs]);
    }

    /**
     * Submits multiple jobs to the queue system. `submitJobs` is typically
     * called from the `onPopupDone` function (after the user presses the
     * popup's action button).
     *
     * @param {any[]}  [parameterSets]  A list of parameters, one per job. Even
     *                                  if your plugin submits only one job
     *                                  (most common case), you must still wrap
     *                                  the parameters in an array. Optional.
     * @helper
     * @document
     */
    protected submitJobs(parameterSets?: any[]) {
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

        const jobs: IJobInfo[] = parameterSets.map(
            (p: IJobInfo) => {
                return {
                    commandName: this.pluginId,
                    params: p,
                    id: randomID(5),
                } as IJobInfo;
            }
        );

        for (const job of jobs) {
            let logTxt = this.onSubmitJobLogMsg(this.pluginId);
            logTxt = removeTerminalPunctuation(logTxt);
            api.messages.log(logTxt, undefined, job.id);
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
     * @returns {RunJobReturn}  A promise that resolves the result (any) when
     *     the job is done, or a string itself (if the job is synchronous), or
     *     undefined if there's nothing to return.
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
            throw new Error(`Plugin ${this.pluginId} has no runJob function.`);
        }

        let logTxt = this.onStartJobLogMsg(this.pluginId);
        logTxt = removeTerminalPunctuation(logTxt);
        api.messages.log(logTxt, parameterSet, jobId);
        const startTime = new Date().getTime();

        const jobResult = this.runJobInBrowser(parameterSet) as RunJobReturn;

        logTxt = this.onEndJobLogMsg(this.pluginId);
        logTxt = removeTerminalPunctuation(logTxt);

        // It's a promise
        if (jobResult instanceof Promise) {
            return jobResult
                .then((result: string | undefined) => {
                    logTxt +=
                        " " +
                        timeDiffDescription(new Date().getTime(), startTime);
                    api.messages.log(logTxt, undefined, jobId);
                    return result;
                })
                .catch((error: Error) => {
                    throw error;
                });
        }

        // It's a string or undefined
        logTxt += " " + timeDiffDescription(new Date().getTime(), startTime);
        api.messages.log(logTxt, undefined, jobId);
        return jobResult;
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
                function: () => {
                    // Could use this, but use api for consistency's sake.
                    // this.onPluginStart();
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
        api.hooks.onJobQueueCommand(this.pluginId, this._runJobInBrowser.bind(this));

        this.onMounted();

        createTestCmdsIfTestSpecified(this);
    }
}