<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        cancelBtnTxt="Done"
        actionBtnTxt=""
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
    >
    <span v-for="tutorial of tutorials" :key="tutorial.youtubeID">
        <a href="#" @click="startTutorial(tutorial)">
            <h6 class="mb-1">{{ tutorial.title }}</h6>
        </a>
        <p class="ms-2 mt-1"> {{ tutorial.message }}</p>
        </span>
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { appName, delayForPopupOpenClose } from "@/Core/GlobalVars";
import { ISimpleVideo } from "@/UI/Layout/Popups/InterfacesAndEnums";
import * as api from "@/Api";

/** VideoTutorialsPlugin */
@Options({
    components: {
        PluginComponent,
    },
})
export default class VideoTutorialsPlugin extends PluginParentClass {
    menuPath = [`[3] ${appName}`, "[6] Video Tutorials..."];
    title = "Video Tutorials";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "videotutorials";
    intro = "Select from a library of video tutorials demonstrating use.";
    filterStr = ""; // Not used, but needed for FilterInput component.

    userArgDefaults: UserArg[] = [];
    alwaysEnabled = true;
    logJob = false;

    tutorials: ISimpleVideo[] = [
        {
            title: "Molecular Docking",
            message:
                `A brief tutorial showing all the steps required to perform molecular docking in ${appName}.`,
            youtubeID: "H8VkRiHayeU",
        },
    ];

    /**
     * Starts a tutorial.
     *
     * @param {ISimpleVideo} tutorial  The tutorial to start.
     */
    startTutorial(tutorial: ISimpleVideo) {
        api.plugins.closeAllPlugins();
        setTimeout(() => {
            api.plugins.runPlugin("simplevideo", {
                title: "Tutorial: " + tutorial.title,
                message: tutorial.message,
                open: true, // open
                youtubeID: tutorial.youtubeID,
            } as ISimpleVideo);
        }, delayForPopupOpenClose);
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

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest}  The selenium test commands.
     */
    getTests(): ITest {
        return {
            closePlugin: new TestCmdList().pressPopupButton(
                ".cancel-btn",
                this.pluginId
            ),
        };
    }
}
</script>

<style scoped lang="scss">
.inverse-indent {
    text-indent: -1em;
    padding-left: 1em !important;
}
</style>
