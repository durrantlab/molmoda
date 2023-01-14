<template>
    <PluginComponent
        :userArgs="userArgs"
        title="New Project"
        v-model="open"
        cancelBtnTxt="Cancel"
        :pluginId="pluginId"
        actionBtnTxt="New Project"
        @onPopupDone="onPopupDone"
        actionBtnTxt2="Save Project First"
        @onPopupDone2="saveProject"
        :isActionBtnEnabled="true"
    >
        <p>
            If you start a new project, your current project will be lost. Would
            you like to
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
import {
    ITest,
    TestClick,
    TestText,
    TestWait,
    TestWaitUntilRegex,
} from "@/Testing/ParentPluginTestFuncs";
import { FileInfo } from "@/FileSystem/FileInfo";

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
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Jacob D. Durrant",
            url: "http://durrantlab.com/",
        },
    ];
    filesToLoad: FileInfo[] = [];
    pluginId = "newproject";

    userArgs: FormElement[] = [];
    alwaysEnabled = true;
    hotkey = "n";

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
    }

    /**
     * Gets the selenium test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commandss.
     */
    getTests(): ITest[] {
        return [
            // First test without saving first
            {
                beforePluginOpens: [this.testLoadExampleProtein()],
                // pluginOpen: [],
                // closePlugin: [],
                afterPluginCloses: [new TestWait(1).cmd],
            },

            // Test with saving first (secondary button)
            {
                beforePluginOpens: [
                    new TestWaitUntilRegex("#styles", "Protein").cmd,
                ],
                // pluginOpen: [],
                closePlugin: [
                    new TestClick("#modal-newproject .action-btn2").cmd,
                    new TestWait(3).cmd,
                ],
                afterPluginCloses: [
                    new TestText(
                        "#modal-savemolecules #filename-savemolecules-item",
                        "test"
                    ).cmd,
                    new TestClick("#modal-savemolecules .action-btn").cmd,
                    new TestWait(5).cmd,
                    new TestClick("#modal-simplemsg .cancel-btn").cmd,
                    new TestWait(1).cmd,
                ],
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
