<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { Options } from "vue-class-component";
import { switchToGoldenLayoutPanel } from "./Common";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";

/**
 * LogWindowPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class LogWindowPlugin extends PluginParentClass {
    menuPath = ["[8] Window", "Records", "Log"];
    title = "Log Panel";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //   name: "Jacob D. Durrant",
        //   url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "logwindow";
    noPopup = true;
    userArgDefaults: UserArg[] = [];

    logJob = false;
    intro = `Switch to the Log panel.`;
    tags = [Tag.All];

    /**
     * Every plugin runs some job. This is the function that does the job running.
     * 
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        switchToGoldenLayoutPanel("Log");
        return Promise.resolve();
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        // This is a test! Nothing specific to do but click the menu items.

        return [];
        // {
        //     afterPluginCloses: () => new TestCmdList().wait(3),
        // };
    }
}
</script>

<style scoped lang="scss"></style>
