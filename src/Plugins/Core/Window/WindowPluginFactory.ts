import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { switchToGoldenLayoutPanel } from "./Common";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { Component } from "vue-facing-decorator";

interface IWindowPluginConfig {
    panelName: string;
    menuPath: string[];
    title: string;
    pluginId: string;
    intro: string;
    details: string;
    /** Optional: override getTests for panels that have non-empty tests. */
    getTestsFn?: () => Promise<ITest[]>;
}

/**
 * Creates a window-switching plugin class for a given panel. All seven
 * Window plugins (Data, Information, Jobs, Log, Navigator, Styles, Viewer)
 * share identical logic — only the panel name, menu path, and descriptions
 * differ. This factory eliminates that duplication.
 *
 * @param {IWindowPluginConfig} config  The panel-specific configuration.
 * @returns {typeof PluginParentClass}  A decorated Vue component class.
 */
export function createWindowPlugin(config: IWindowPluginConfig): typeof PluginParentClass {
    /**
     * A plugin that simply switches to a specified GoldenLayout panel.
     */
    @Component({
        components: {
            PluginComponent,
        },
    })
    class WindowPlugin extends PluginParentClass {
        menuPath = config.menuPath;
        title = config.title;
        softwareCredits: ISoftwareCredit[] = [];
        contributorCredits: IContributorCredit[] = [];
        pluginId = config.pluginId;
        noPopup = true;
        userArgDefaults: UserArg[] = [];
        logJob = false;
        intro = config.intro;
        details = config.details;
        tags = [Tag.All];

        /**
         * Every plugin runs some job. This is the function that does the job running.
         *
         * @returns {Promise<void>}  Resolves when the job is done.
         */
        runJobInBrowser(): Promise<void> {
            switchToGoldenLayoutPanel(config.panelName);
            return Promise.resolve();
        }

        /**
         * Gets the test commands for the plugin. For advanced use.
         *
         * @gooddefault
         * @document
         * @returns {ITest}  The selenium test commands.
         */
        async getTests(): Promise<ITest[]> {
            if (config.getTestsFn) {
                return config.getTestsFn();
            }
            return [];
        }
    }

    return WindowPlugin;
}