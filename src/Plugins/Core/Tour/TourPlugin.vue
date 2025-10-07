<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" actionBtnTxt="Start Tour" cancelBtnTxt="Cancel"
        @onPopupDone="onPopupDone">
        <p v-if="pluginToTour" v-html="pluginToTour.intro + ' ' + pluginToTour.details"></p>
    </PluginComponent>
</template>
<script lang="ts">
import { Options } from "vue-class-component";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import * as api from "@/Api";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { FailingTest } from "@/Testing/FailingTest";
import { ISoftwareCredit, IContributorCredit } from "@/Plugins/PluginInterfaces";
import { set } from "lodash";

/**
 * TourPlugin
 * A plugin that displays an introductory modal before starting a tour for another plugin.
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class TourPlugin extends PluginParentClass {
    menuPath = null;
    title = "Plugin Tour";
    pluginId = "tourplugin";
    intro = "";
    details = "";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    userArgDefaults: UserArg[] = [];
    tags = []; // Should not be shown in help
    noPopup = true;

    pluginToTour: PluginParentClass | null = null;
    testIndexToRun = 0;

    /**
     * Called before the popup opens. It receives the plugin to be toured as a payload.
     *
     * @param {object} payload The payload containing the plugin instance.
     * @param {PluginParentClass} payload.plugin The plugin to start the tour for.
     * @param {number} [payload.testIndex=0] The index of the test to use for the tour.
     * @returns {Promise<boolean | void>} Returns false to prevent opening if no plugin is provided.
     */
    async onBeforePopupOpen(payload: { plugin: PluginParentClass; testIndex?: number }): Promise<boolean | void> {
        if (!payload || !payload.plugin) {
            console.error("TourPlugin: No plugin provided in payload.");
            return false; // Prevent popup from opening
        }
        this.pluginToTour = payload.plugin;
        this.testIndexToRun = payload.testIndex || 0;
        this.title = `Tour: ${this.pluginToTour.title}`;
    }

    /**
     * Called when the "Start Tour" button is clicked. It initiates the tour.
     */
    onPopupDone() {
        if (this.pluginToTour) {
            api.tour.startTour(this.pluginToTour, this.testIndexToRun);
        }
    }

    /**
     * This plugin does not run a background job.
     *
     * @returns {Promise<void>}
     */
    async runJobInBrowser(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * This plugin is not intended to be tested via the automated testing system.
     *
     * @returns {Promise<ITest>} A failing test configuration.
     */
    async getTests(): Promise<ITest> {
        return FailingTest;
    }
}
</script>