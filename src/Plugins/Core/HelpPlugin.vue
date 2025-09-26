<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" cancelBtnTxt="Done" actionBtnTxt=""
        @onPopupDone="onPopupDone" @onUserArgChanged="onUserArgChanged" @onMolCountsChanged="onMolCountsChanged">
        <FilterInput :list="loadedPlugins" :extractTextToFilterFunc="extractTextToFilterFunc" @onFilter="onFilter"
            v-model="filterStr"></FilterInput>

        <span v-for="plugin of loadedPluginsToUse" :key="plugin.pluginId">
            <span v-if="plugin.title !== '' && plugin.menuPath !== null">
                <h6 class="mb-1">{{ plugin.title }}</h6>

                <p class="ms-2 mb-0 alert alert-light lh-1 p-0 inverse-indent">
                    <!-- <small v-html="menuPathToUse(plugin.menuPath)"></small> -->
                    <small>
                        Menu: <PluginPathLink :plugin="plugin"></PluginPathLink>
                        <button v-if="hasTests(plugin)" @click="startTour(plugin)"
                            class="btn btn-sm btn-outline-primary py-0 px-1 ms-2" style="font-size: 0.7em;">
                            Start Tour
                        </button>
                    </small>
                </p>

                <p v-if="creditsToShow(plugin) !== ''" class="ms-2 mb-0 alert alert-light lh-1 p-0 inverse-indent">
                    <small v-html="creditsToShow(plugin)"></small>
                </p>

                <p v-if="citationsToShow(plugin) !== ''" class="ms-2 mb-0 alert alert-light lh-1 p-0 inverse-indent">
                    <small v-html="citationsToShow(plugin)"></small>
                </p>

                <p v-html="plugin.intro + ' ' + plugin.details" class="ms-2 mt-1"></p>
            </span>
        </span>
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import { Prop } from "vue-property-decorator";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import PluginPathLink from "@/UI/Navigation/PluginPathLink.vue";
import FilterInput from "@/UI/Components/FilterInput.vue";
import { citationsTxt } from "../Citations";
import { Tag, matchesTag } from "./ActivityFocus/ActivityFocusUtils";
import * as api from "@/Api";

/** HelpPlugin */
@Options({
    components: {
        PluginComponent,
        PluginPathLink,
        FilterInput,
    },
})
export default class HelpPlugin extends PluginParentClass {
    @Prop({ required: true }) loadedPlugins!: PluginParentClass[];

    menuPath = ["Help", "[5] Plugin Info..."];
    title = "Plugin Info";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "help";
    intro = "List information about each of the loaded plugins.";
    filterStr = "";  // Not used, but needed for FilterInput component.
    userArgDefaults: UserArg[] = [];

    logJob = false;
    tags = [Tag.All];

    filteredPlugins: PluginParentClass[] | null = null;

    /**
     * Checks if a plugin has any tests defined.
     *
     * @param {PluginParentClass} plugin The plugin to check.
     * @returns {boolean} True if the plugin has tests.
     */
    hasTests(plugin: PluginParentClass): boolean {
        const excludedPlugins = [
            'help',
            'about',
            'archivedversions',
            'documentationlink',
            'errorreporting',
            'statcollection',
            'fetcherpermission',
            'datawindow',
            'informationwindow',
            'jobswindow',
            'logwindow',
            'navigatorwindow',
            'resetlayout',
            'styleswindow',
            'viewerwindow',
            'simplemsg',
            'simplesvgpopup',
            'simpletabledata',
            'simplevideo',
            'yesno'
        ];
        return !excludedPlugins.includes(plugin.pluginId);
    }

    /**
 * Starts a tour for the given plugin.
 *
 * @param {PluginParentClass} plugin The plugin for which to start a tour.
 */
    startTour(plugin: PluginParentClass) {
        this.closePopup();
        setTimeout(() => {
            api.tour.startTour(plugin);
        }, 300); // Delay to allow the help popup to close
    }

    /**
     * Gets the text to use for filtering the plugins.
     *
     * @param {PluginParentClass} plugin  The plugin to get the text for.
     * @returns {string} The text to use for filtering the plugins. This is the
     *                   text that is searched for in the filter box.
     */
    extractTextToFilterFunc(plugin: PluginParentClass): string {
        return plugin.title + " " + plugin.intro;
    }

    /**
     * Filters the plugins based on the user's input (filter text).
     *
     * @param {PluginParentClass[]}  plugins  The list of filtered plugins
     *                                        emitted by the component.
     * @returns {PluginParentClass[]} The list of plugins to display (filtered).
     */
    filterByTags(plugins: PluginParentClass[]): PluginParentClass[] {
        return plugins.filter(p => matchesTag(p.tags));
    }

    /**
     * Gets the plugins to display. If the user has entered text in the
     * filter box, then this will be the filtered list. Otherwise, it will
     * be the full list.
     *
     * @returns {PluginParentClass[]} The list of plugins to display.
     */
    get loadedPluginsToUse(): PluginParentClass[] {
        if (this.filteredPlugins === null) {
            return this.filterByTags(this.loadedPlugins);
        }

        return this.filterByTags(this.filteredPlugins);
    }

    /**
     * Filters the plugins based on the user's input (filter text).
     *
     * @param {PluginParentClass[]}  plugins  The list of filtered plugins
     *                                        emitted by the component.
     */
    onFilter(plugins: PluginParentClass[]): void {
        this.filteredPlugins = plugins;
    }

    /**
     * Runs when the popup closes via done button. Here, does nothing.
     */
    onPopupDone() {
        return;
    }

    /**
     * Every plugin runs some job. This is the function that does the
     * job running. About plugin does not have a job.
     * 
     * @returns {Promise<void>}  Resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        return Promise.resolve();
    }

    // @Watch("loadedPlugins")
    // onLoadedPluginsChange(newVal: PluginParentClass[]) {
    // }

    /**
     * Gets the citations to display, html formatted.
     *
     * @param {PluginParentClass}  plugin The plugin to get the citations for.
     * @returns {string} The citations to display, html formatted.
     */
    citationsToShow(plugin: PluginParentClass): string {
        return citationsTxt(plugin.infoPayload, false);
    }

    /**
     * Gets the credits to display, html formatted.
     *
     * @param {PluginParentClass}  plugin The plugin to get the credits for.
     * @returns {string} The credits to display, html formatted.
     */
    creditsToShow(plugin: PluginParentClass): string {
        if (
            plugin.softwareCredits.length + plugin.contributorCredits.length ===
            0
        ) {
            return "";
        }

        const items: string[] = [];

        for (const credit of plugin.contributorCredits) {
            if (credit.url) {
                items.push(
                    `<a href="${credit.url}" target="_blank">${credit.name}</a>`
                );
            } else {
                items.push(credit.name);
            }
        }

        for (const credit of plugin.softwareCredits) {
            if (credit.url) {
                items.push(
                    `<a href="${credit.url}" target="_blank">${credit.name}</a>`
                );
            } else {
                items.push(credit.name);
            }
        }

        let html = items.join(", ");
        html = items.length === 1 ? "Credit: " + html : "Credits: " + html;

        return html;
    }

    // /**
    //  * Gets the menu path to display for the plugin.
    //  *
    //  * @param {string | string[] | null}  menuPath The menu path to display.
    //  * @returns {string} The menu path to display, formatted as a string.
    //  */
    // menuPathToUse(menuPath: string | string[] | null): string {
    //     // If null, return ""
    //     if (menuPath === null) {
    //         return "";
    //     }

    //     // If it's an array, convert it to a string.
    //     if (Array.isArray(menuPath)) {
    //         menuPath = menuPath.join("/");
    //     }

    //     // Remove anything like [#], where # is a number
    //     menuPath = menuPath.replace(/\[\d+\] /g, "");

    //     menuPath = menuPath.replace(/\//g, " &rarr; ");

    //     return "Menu: " + menuPath;
    // }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest}  The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        const basicTest: ITest = {
            closePlugin: () => new TestCmdList().pressPopupButton(
                ".cancel-btn",
                this.pluginId
            ),
        };
        const filterTest: ITest = {
            pluginOpen: () => new TestCmdList()
                .waitUntilRegex(`#modal-${this.pluginId}`, "About") // Wait for "About" to be visible
                .text(`#modal-${this.pluginId} input[type="text"]`, "Quit") // Filter for "Quit"
                .waitUntilNotRegex(`#modal-${this.pluginId}`, "About"), // "About" should now be hidden
            closePlugin: () => new TestCmdList().pressPopupButton(
                ".cancel-btn",
                this.pluginId
            ),
        };
        return [basicTest, filterTest];
    }
}
</script>

<style scoped lang="scss">
.inverse-indent {
    text-indent: -1em;
    padding-left: 1em !important;
}
</style>
