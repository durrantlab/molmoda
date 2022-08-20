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

export abstract class PluginParent extends Vue {
    // The menu path, since all plugins should be accessible from the menu.
    abstract menuPath: string[] | string;

    // Be sure to credit authors (with license).
    abstract softwareCredits: ISoftwareCredit[];
    abstract contributorCredits: IContributorCredit[];

    // A unique id defines the plugin.
    abstract pluginId: string;

    // The start function runs when the user first begins using the plugin. For
    // example, if the plugin is in a popup, this function would open the popup.
    abstract onPluginStart(): void;

    // Every plugin runs some calculation. This is the function that does the
    // calculating. It receives the same parameterSets submitted via the
    // submitJobs function (see below), but one at a time.
    abstract runJob(parameters: any): void;

    // This function is called when the plugin is mounted.
    protected onMounted() {
        // can be optionally overridden.
        return;
    }

    // This function submits jobs to the job queue system. Note that it is jobs
    // plural. The function variable `parameterSets` is a list of parameters,
    // one per job.
    protected submitJobs(parameterSets?: any[]) {
        if (parameterSets === undefined) {
            parameterSets = [undefined]
        }
        if (parameterSets.length === undefined) {
            throw new Error(
                `parameterSets must be an array. If your plugin (${this.pluginId}) only submits one job, wrap it in [].`
            );
        }
        if (parameterSets.length === 0) {
            parameterSets = [undefined]
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
                    this.onPluginStart();
                }
            } as IMenuItem,
            pluginId: this.pluginId,
        } as IPluginSetupInfo);

        // Register with job queue system
        api.hooks.onJobQueueCommand(this.pluginId, this.runJob.bind(this));

        this.onMounted();
    }
}
