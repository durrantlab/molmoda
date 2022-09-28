import * as JobQueue from "@/JobQueue";
import { IMenuItem } from "@/UI/Navigation/Menu/Menu";
import { Vue } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "./PluginInterfaces";
import * as api from "@/Api";
import { randomID, removeTerminalPunctuation, timeDiffDescription } from "@/Core/Utils";
import { loadedPlugins } from "./LoadedPlugins";
import { runTestIfSpecified } from "@/Testing/ParentPluginTestFuncs";

export interface IPluginSetupInfo {
    softwareCredits: ISoftwareCredit[];
    contributorCredits: IContributorCredit[];
    menuData: IMenuItem;
    pluginId: string;
}

export type RunJobReturn =
    | Promise<string | undefined>
    | string
    | void
    | undefined;

/**
 * PluginParent
 */
export abstract class PluginParent extends Vue {
    // The menu path. The vast majority of plugins should be accessible from the
    // menu. But set to null if you don't want it to be.
    abstract menuPath: string[] | string | null;

    // Be sure to credit authors (with license).
    abstract softwareCredits: ISoftwareCredit[];
    abstract contributorCredits: IContributorCredit[];

    // A unique id defines the plugin.
    abstract pluginId: string;

    /**
     * Runs when the user first starts the plugin. For example, if the plugin is
     * in a popup, this function would open the popup.
     *
     * @param {any}    [payload]  Passes extra data to the plugin. Useful when
     *                            running plugin outside of the menu system.
     *                            Optional
     */
    abstract onPluginStart(payload?: any): void;

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @param {any} [parameters]  The same parameterSets submitted via the
     *                            submitJobs function, but one at a time.
     *                            Optional.
     * @returns {RunJobReturn}  A promise that resolves when the job is done,
     *     with the result (string), or a string itself (if the job is
     *     synchronous), or undefined if there's nothing to return (so user not
     *     required to use).
     */
    abstract runJob(parameters?: any): RunJobReturn;

    /**
     * Called when the plugin is mounted.
     */
    protected onMounted() {
        // can be optionally overridden.
        return;
    }

    /**
     * Check if this plugin can currently be used.  This can be optionally
     * overwritten.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    protected checkUseAllowed(): string | null {
        return null;
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
            let logTxt = this.onSubmitJobLogMsg();
            logTxt = removeTerminalPunctuation(logTxt);
            api.messages.log(logTxt, undefined, job.id);
        }

        JobQueue.submitJobs(jobs);
    }

    /**
     * The message to log when the plugin job is submitted. Children can
     * overwrite this function. Return "" if you want to hide this step.
     *
     * @returns {string}  The message to log.
     */
    onSubmitJobLogMsg(): string {
        return `Job ${this.pluginId} submitted`;
    }

    /**
     * The message to log when the plugin job starts. The parameters will be
     * automatically added if given. Children can overwrite this function.
     * Return "" if you want to hide this step.
     *
     * @returns {string}  The message to log.
     */
    onStartJobLogMsg(): string {
        return `Job ${this.pluginId} started`;
    }

    /**
     * The message to log when the plugin job finishes. Total run time will be
     * appended. Children can overwrite this function.  Return "" if you want to
     * hide this step.
     *
     * @returns {string}  The message to log.
     */
    onEndJobLogMsg(): string {
        return `Job ${this.pluginId} ended`;
    }

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
        let logTxt = this.onStartJobLogMsg();
        logTxt = removeTerminalPunctuation(logTxt);
        api.messages.log(logTxt, parameters, jobId);
        const startTime = new Date().getTime();

        const jobResult = this.runJob(parameters);

        logTxt = this.onEndJobLogMsg();
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

    onRunTest(): string[] {
        // TODO: In future, this should be abstract (required for children).
        return [];
    }

    /** mounted function */
    mounted() {
        // Do some quick validation
        if (this.pluginId !== this.pluginId.toLowerCase()) {
            throw new Error(
                "Plugin id must be lowercase. Plugin id: " + this.pluginId
            );
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

        runTestIfSpecified(this);
    }
}
