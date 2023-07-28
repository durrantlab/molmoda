<template>
    <PluginComponent
        :userArgs="userArgs"
        :title="title"
        v-model="open"
        cancelBtnTxt="Cancel"
        :pluginId="pluginId"
        actionBtnTxt="New Project"
        @onPopupDone="onPopupDone"
        actionBtnTxt2="Save Project First"
        @onPopupDone2="saveProject"
        :isActionBtnEnabled="true"
        :intro="intro"
    >
        <p>
            Would you like to
            <a href="#" @click="saveProject">save the project first</a>?
        </p>
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import FormFile from "@/UI/Forms/FormFile.vue";
import { setStoreIsDirty, storeIsDirty } from "@/Store/LoadAndSaveStore";
import * as api from "@/Api";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TestCmdList } from "@/Testing/TestCmdList";

/**
 * NewProjectPlugin
 */
@Options({
    components: {
        PluginComponent,
        FormFile,
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

    userArgs: FormElement[] = [];
    alwaysEnabled = true;
    hotkey = "n";
    intro = "Start a new project. Your current project will be lost."

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
    onBeforePopupOpen() {
        if (!storeIsDirty) {
            // Since store is not dirty, just reload page.
            window.location.reload();
        }
        return;
    }

    /**
     * Runs when the user presses the save project link.
     *
     * @param {Event | undefined} e  The event (if any) that triggered this
     *                               function.
     */
    saveProject(e: Event | undefined) {
        if (e !== undefined) {
            e.preventDefault();
        }
        this.closePopup();
        setTimeout(() => {
            api.plugins.runPlugin("savemolecules", true);
        }, 1000);
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     */
    runJobInBrowser(/* fileInfo: IFileInfo */) {
        setStoreIsDirty(false);
        window.location.reload();
        return;
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commandss.
     */
    getTests(): ITest[] {
        return [
            // First test without saving first
            {
                beforePluginOpens: new TestCmdList().loadExampleProtein().cmds,
                afterPluginCloses: new TestCmdList().wait(1).cmds,
            },

            // Test with saving first (secondary button)
            {
                beforePluginOpens: new TestCmdList().waitUntilRegex(
                    "#styles",
                    "Protein"
                ).cmds,
                closePlugin: new TestCmdList()
                    .click("#modal-newproject .action-btn2")
                    .wait(3).cmds,
                afterPluginCloses: new TestCmdList()
                    .text(
                        "#modal-savemolecules #filename-savemolecules-item",
                        "test"
                    )
                    .click("#modal-savemolecules .action-btn")
                    .wait(5)
                    .click("#modal-simplemsg .cancel-btn")
                    .wait(1).cmds,
            },
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
