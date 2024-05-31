<template>
    <PluginComponent
        :infoPayload="infoPayload"
        v-model="open"
        cancelBtnTxt="Cancel"
        actionBtnTxt="New Project"
        @onPopupDone="onPopupDone"
        :isActionBtnEnabled="true"
        @onUserArgChanged="onUserArgChanged"
    >
        <!-- actionBtnTxt2="Save Project First" -->
        <!-- @onPopupDone2="saveProject" -->
        <Alert type="warning">
            Would you like to save the current project first? If so, press the
            "Cancel" button, then File -> Save...
        </Alert>

        <!-- <p>
            Would you like to
            <a href="_#" @click="saveProject">save the project first</a>?
        </p> -->
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import FormFile from "@/UI/Forms/FormFile.vue";
import { setStoreIsDirty, storeIsDirty } from "@/Store/LoadAndSaveStore";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TestCmdList } from "@/Testing/TestCmdList";
import Alert from "@/UI/Layout/Alert.vue";
import { closeDownApp } from "@/Core/Utils/CloseAppUtils";
import { Tag } from "@/Plugins/Tags/Tags";

/**
 * NewProjectPlugin
 */
@Options({
    components: {
        PluginComponent,
        FormFile,
        Alert
    },
})
export default class NewProjectPlugin extends PluginParentClass {
    menuPath = "File/[1] Project/[0] New...";
    title = "New Project";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    filesToLoad: FileInfo[] = [];
    pluginId = "newproject";

    userArgDefaults: UserArg[] = [];
    
    hotkey = "n";
    intro = "Start a new project. Your current project will be lost.";
    tags = [Tag.All];

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
        this.closePopup();
        this.submitJobs();
    }

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     */
    async onBeforePopupOpen() {
        if (!storeIsDirty) {
            // Since store is not dirty, just reload page.
            closeDownApp(undefined, false);
        }
    }

    /**
     * Runs when the user presses the save project link.
     *
     * @param {Event | undefined} e  The event (if any) that triggered this
     *                               function.
     */
    // saveProject(e: Event | undefined) {
    //     if (e !== undefined) {
    //         e.preventDefault();
    //     }
    //     this.closePopup();
    //     setTimeout(() => {
    //         api.plugins.runPlugin("savemolecules", true);
    //     }, delayForPopupOpenClose);
    // }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     * 
     * @returns {Promise<void>}  Resolves when the job is done.
     */
    async runJobInBrowser(): Promise<void> {
        setStoreIsDirty(false);
        closeDownApp(undefined, false);
        return Promise.resolve();
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commandss.
     */
    async getTests(): Promise<ITest[]> {
        return [
            // First test without saving first
            {
                beforePluginOpens: new TestCmdList().loadExampleMolecule(),
                afterPluginCloses: new TestCmdList(),
            },

            // Test with saving first (secondary button)
            // {
            //     beforePluginOpens: new TestCmdList().waitUntilRegex(
            //         "#styles",
            //         "Protein"
            //     ),
            //     closePlugin: new TestCmdList()
            //         .click("#modal-newproject .action-btn2")
            //         .wait(3),
            //     afterPluginCloses: new TestCmdList()
            //         .text(
            //             "#modal-savemolecules #filename-savemolecules-item",
            //             "test"
            //         )
            //         .click("#modal-savemolecules .action-btn")
            //         .wait(5)
            //         .click("#modal-simplemsg .cancel-btn"),
            // },
        ];
    }
}
</script>

<style scoped lang="scss">
.inverse-indent {
    text-indent: -1em;
    padding-left: 1em;
}
</style>
