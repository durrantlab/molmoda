<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onUserArgChanged="onUserArgChanged"
    ></PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { Options } from "vue-class-component";
import { switchToGoldenLayoutPanel } from "./Common";

/**
 * DataWindowPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class DataWindowPlugin extends PluginParentClass {
    menuPath = ["[9] Window", "Molecules", "[8] Data"];
    title = "";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //   name: "Jacob D. Durrant",
        //   url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "datawindow";
    noPopup = true;
    userArgDefaults: UserArg[] = [];
    alwaysEnabled = true;
    logJob = false;
    intro = `Switch to the data panel.`;

    /**
     * Every plugin runs some job. This is the function that does the job running.
     */
    runJobInBrowser() {
        switchToGoldenLayoutPanel("Data");
        return;
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    getTests(): ITest[] {
        // This is a test! Nothing specific to do but click the menu items.

        return [];
        // {
        //     afterPluginCloses: new TestCmdList().wait(3),
        // };
    }
}
</script>

<style scoped lang="scss"></style>
