import * as JobQueue from "@/JobQueue";
import { IMenuItem } from "@/UI/Navigation/Menu/Menu";
import { Vue } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "./PluginInterfaces";
import * as api from "@/Api";

export interface IPluginSetupInfo {
    softwareCredits: ISoftwareCredit[];
    contributorCredits: IContributorCredit[];
    menuData: IMenuItem;
    pluginId: string;
}

// Keep track of all loaded plugins. Useful for loading a plugin independent of
// the menu system.
export const loadedPlugins: { [key: string]: PluginParent } = {};

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
     * @param {any} [payload]  Included if you want to pass extra data to the
     *                         plugin. Probably only useful if not using the
     *                         menu system. Optional.
     */
    abstract onPluginStart(payload?: any): void;

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @param {any} [parameters]  The same parameterSets submitted via the
     *                            submitJobs function, but one at a time.
     *                            Optional.
     */
    abstract runJob(parameters?: any): void;

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
     * "jobs" plural.
     *
     * @param {any[]} [parameterSets]  A list of parameters, one per job.
     *                                 Optional.
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

        const jobs: JobQueue.JobInfo[] = parameterSets.map(
            (p: JobQueue.JobInfo) => {
                return {
                    commandName: this.pluginId,
                    params: p,
                } as JobQueue.JobInfo;
            }
        );
        JobQueue.submitJobs(jobs);
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
        api.hooks.onJobQueueCommand(this.pluginId, this.runJob.bind(this));

        loadedPlugins[this.pluginId] = this;

        this.onMounted();
    }
}
