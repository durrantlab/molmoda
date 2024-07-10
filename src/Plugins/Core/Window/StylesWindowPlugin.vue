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
import { Tag } from "@/Plugins/Tags/Tags";

/**
 * StylesWindowPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class StylesWindowPlugin extends PluginParentClass {
    menuPath = ["[9] Window", "Molecules", "[5] Styles"];
    title = "";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //   name: "Jacob D. Durrant",
        //   url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "styleswindow";
    noPopup = true;
    userArgDefaults: UserArg[] = [];
    
    logJob = false;
    intro = `Switch to the Styles panel.`;
    tags = [Tag.All];

    /**
     * Every plugin runs some job. This is the function that does the job running.
     * 
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        switchToGoldenLayoutPanel("Styles");
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
        //     afterPluginCloses: new TestCmdList().wait(3),
        // };
    }
}
</script>

<style scoped lang="scss"></style>
