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
import { loadedPlugins } from "../../LoadedPlugins";
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
    // The menu path. The vast majority of plugins should be accessible from the
    // menu. But set to null if you don't want it to be. Children must
    // overwrite.
    abstract menuPath: string[] | string | null;

    // Be sure to credit authors (with license). Children must overwrite both.
    abstract softwareCredits: ISoftwareCredit[];
    abstract contributorCredits: IContributorCredit[];

    // A unique id defines the plugin. Children must overwrite.
    abstract pluginId: string;

    abstract intro: string;

    abstract userInputs: FormElement[];

    // In some cases, must pass information to the plugin when it opens.
    // Typicaly when using the plugin outside the menu system.
    protected payload: any = undefined;

    /**
     * Runs when the user first starts the plugin. For example, if the plugin is
     * in a popup, this function would open the popup.
     *
     * @param {any} [payload]   Included if you want to pass extra data to the
     *                          plugin. Probably only useful if not using the
     *                          menu system. Optional.
     */
    public onPluginStart(payload?: any) {
        // Children should not overwrite this function! Use onPopupOpen instead.
        this.payload = payload;
        this.beforePopupOpen();
        this.openPopup();
        setTimeout(() => {
            this.onPopupOpen();
        }, 1000);
    }

    /**
     * Automatically submit the jobs once the popup is done. This can be
     * overridden by children plugins. The default version below just submits the
     * user inputs as a single job, but in some situations you might want to
     * launch multiple jobs.
     *
     * @param {IUserArg[]} userInputs  The user arguments.
     */
    protected onPopupDone(userInputs: IUserArg[]) {
        this.submitJobs([userInputs]);
    }

    /**
     * This function submits jobs to the job queue system. Note that it is
     * "jobs" plural. Also assigns jobIds.
     *
     * @param {any[]}  [parameterSets]  A list of parameters, one per job.
     *                                  Optional.
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
     * Every plugin runs some job. This is the function that does the job
     * running. Children must overwrite this function.
     *
     * @param {any} [parameters]  The same parameterSets submitted via the
     *                            submitJobs function, but one at a time.
     *                            Optional.
     * @returns {RunJobReturn}  A promise that resolves when the job is done,
     *     with the result (string), or a string itself (if the job is
     *     synchronous), or undefined if there's nothing to return (so user not
     *     required to use).
     */
    abstract runJob(parameters: any): RunJobReturn;

    /**
     * This function wraps around runJob to log start/end messages. It is called
     * by the job queue system.
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
     * Called when the plugin is mounted.
     */
    onMounted() {
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

        // Add to menu and credits.
        this.$emit("onPluginSetup", {
            softwareCredits: this.softwareCredits,
            contributorCredits: this.contributorCredits,
            menuData: {
                path: this.menuPath,
                function: () => {
                    // Could use this, but use api for consistency's sake.
                    // this.onPluginStart();
                    const msg = this.checkUseAllowed();
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

        loadedPlugins[this.pluginId] = this;

        this.onMounted();

        createTestCmdsIfTestSpecified(this);
    }

    /**
     * Occasionally, you might want to update a user variable from the plugin's
     * context. For example, when renaming a molecule, it's helpful to
     * prepopulate the new name field with the existing name. For this to work,
     * the <PluginComponent> must have ref "pluginComponent".
     *
     * @param {IUserArg[]} userArgs  The user variables to update.
     */
    protected updateUserVars(userArgs: IUserArg[]) {
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
        for (const userArg of userArgs) {
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
