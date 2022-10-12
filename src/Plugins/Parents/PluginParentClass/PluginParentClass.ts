/* eslint-disable jsdoc/check-tag-names */
// Evey plugin component class must inherit this one.
import * as JobQueue from "@/JobQueue";
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
import {
    createTestCmdsIfTestSpecified,
    // ITestCommand,
} from "@/Testing/ParentPluginTestFuncs";
import { HooksMixin } from "./Mixins/HooksMixin";
import { PopupMixin } from "./Mixins/PopupMixin";
import { JobMsgsMixin } from "./Mixins/JobMsgsMixin";
import { ValidationMixin } from "./Mixins/ValidationMixin";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";

export type RunJobReturn =
    | Promise<string | undefined>
    | string
    | void
    | undefined;

/**
 * PluginParentClass
 */
export abstract class PluginParentClass extends mixins(
    HooksMixin,
    PopupMixin,
    JobMsgsMixin,
    ValidationMixin
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
     * An introductory sentence or paragraph describing the plugin. Appears at
     * the top of the popup.
     *
     * @document
     * @type {string}
     */
    intro = "";

    /**
     * A list of user inputs. Note that `userInputs` defines the user
     * arguments/parameters, but it is not reactive. See it as an unchangable
     * template. Use `updateUserInputs` to programmatically change actual
     * user-specified inputs.
     *
     * @type {FormElement[]}
     */
    abstract userInputs: FormElement[];

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
        this.onBeforePopupOpen();
        this.openPopup();
        setTimeout(() => {
            this.onPopupOpen();
        }, 1000);
    }

    /**
     * Runs when the user clicks the plugin action button (e.g., "Load"). You
     * likely want to call the `submitJobs` function from `onPopupDone` to
     * submit job(s) to the queue system.
     *
     * The default version submits the user inputs as a single job. Override it
     * if you want to modify those parameters before submitting to the queue, or
     * if you want to submit multiple jobs to the queue.
     *
     * @param {IUserArg[]} userInputs  The user arguments.
     * @gooddefault
     * @document
     */
    protected onPopupDone(userInputs: IUserArg[]): void {
        this.submitJobs([userInputs]);
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

        const jobs: JobQueue.IJobInfo[] = parameterSets.map(
            (p: JobQueue.IJobInfo) => {
                return {
                    commandName: this.pluginId,
                    params: p,
                    id: randomID(5),
                } as JobQueue.IJobInfo;
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
     * Each plugin is associated with specific jobs (calculations). This
     * function runs a single job (or calls the JavaScript/WASM libraries to run
     * the job). The job-queue system calls `runJob` directly.
     *
     * @param {any} [parameterSet]  One of the parameterSets items submitted via
     *                              the `submitJobs` function. Optional.
     * @returns {RunJobReturn}  A promise that resolves the result (a string)
     *     when the job is done, or a string itself (if the job is synchronous),
     *     or undefined if there's nothing to return.
     */
    abstract runJob(parameterSet: any): RunJobReturn;

    /**
     * Wraps around runJob to log start/end messages. It is called by the job
     * queue system.
     *
     * @param {string} [jobId]       The job id to use (optional).
     * @param {any}    [parameters]  The same parameterSets submitted via the
     *                               submitJobs function, but one at a time.
     *                               Optional.
     * @returns {RunJobReturn}  A promise that resolves when the job is done,
     *     with the result (string), or a string itself (if the job is
     *     synchronous), or undefined if there's nothing to return (so user not
     *     required to use).
     */
    private _runJob(jobId?: string, parameters?: any): RunJobReturn {
        if (this.runJob === null) {
            // Below won't ever happen (wouldn't pass validation), but makes it
            // easy to avoid typescript error.
            throw new Error(`Plugin ${this.pluginId} has no runJob function.`);
        }

        let logTxt = this.onStartJobLogMsg(this.pluginId);
        logTxt = removeTerminalPunctuation(logTxt);
        api.messages.log(logTxt, parameters, jobId);
        const startTime = new Date().getTime();

        const jobResult = this.runJob(parameters) as RunJobReturn;

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

        if (this.menuPath === "") {
            // debugger;
            console.log(">>", this.pluginId);
        }

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
        api.hooks.onJobQueueCommand(this.pluginId, this._runJob.bind(this));

        this.onMounted();

        createTestCmdsIfTestSpecified(this);
    }

    /**
     * Programmatically update a user variable. Necessary because `userInputs`
     * is NOT reactive. Useful to do things like (1) prepopulate a `userInputs`
     * value or (2) modify one `userInputs` value based on the value of another
     * (see also `<PluginComponent>`'s `onDataChanged` function). For
     * `updateUserInputs` to work, the plugin's `<PluginComponent>` must have
     * `ref="pluginComponent"`.
     *
     * @param {IUserArg[]} userInputs  The user variables to update.
     * @helper
     * @document
     */
    protected updateUserInputs(userInputs: IUserArg[]) {
        const pluginComponent = this.$refs["pluginComponent"] as any;
        if (pluginComponent === undefined) {
            console.warn(
                'To use the updateUserVars() function, the PluginComponent must have ref "pluginComponent".'
            );
            return;
        }
        const existingNames: string[] = pluginComponent.userInputsToUse.map(
            (i: FormElement): string => {
                return i.id;
            }
        );
        for (const userArg of userInputs) {
            const name = userArg.name;
            const idx = existingNames.indexOf(name);
            if (idx === -1) {
                // Asking to update a user var that doesn't exist.
                console.warn(
                    `Plugin ${this.pluginId} is trying to update user var ${name}, but it doesn't exist.`
                );
                return;
            }

            // Update the value
            pluginComponent.userInputsToUse[idx].val = userArg.val;
        }
    }

    // /**
    //  * Adds commands to run when testing the plugin. Assume the popup is open,
    //  * and no need to click the action button.
    //  *
    //  * @returns {ITestCommand[]}  The commands to run.
    //  */
    // onRunTest(): ITestCommand[] {
    //     // TODO: In future, this should be abstract (required for children).
    //     return [];
    // }
}
