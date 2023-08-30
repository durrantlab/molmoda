<template>
    <PluginComponent
        :infoPayload="infoPayload"
        v-model="open"
        cancelBtnTxt="Cancel"
        actionBtnTxt="Append Example Project"
        @onPopupDone="onPopupDone"
        :isActionBtnEnabled="true"
        @onUserArgChanged="onUserArgChanged"
    >
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import FormFile from "@/UI/Forms/FormFile.vue";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TestCmdList } from "@/Testing/TestCmdList";
import { filesToFileInfos } from "@/FileSystem/Utils";
import { dynamicImports } from "@/Core/DynamicImports";

/**
 * ExampleDataPlugin
 */
@Options({
    components: {
        PluginComponent,
        FormFile,
    },
})
export default class ExampleDataPlugin extends PluginParentClass {
    menuPath = "File/[1] Project/[6] Example...";
    title = "Append Example Project";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    filesToLoad: FileInfo[] = [];
    pluginId = "openexampleproject";

    userArgDefaults: UserArg[] = [];
    alwaysEnabled = true;
    intro =
        "Append an example project to the current workspace. Useful for exploring and testing the Biotite interface.";

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
        this.closePopup();
        this.submitJobs();
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     */
    async runJobInBrowser(/* fileInfo: IFileInfo */) {
        // Load the example project

        // Fetch the file "./example.biotite" file using fetch. It is a binary
        // file.
        const axios = await dynamicImports.axios.module;
        const response = await axios.get("./example.biotite", {
            responseType: "arraybuffer",
        });

        // Convert to blob
        const blob = new Blob([response.data], {
            type: "application/octet-stream",
        }); // You can adjust the type if needed.

        // Convert to a file
        const file = new File([blob], "example.biotite");

        // Convert file to fileInfo
        return filesToFileInfos([file], false, ["BIOTITE"]).then(
            (fileInfos: (FileInfo | string)[]) => {
                this.addFileInfoToViewer(fileInfos[0] as FileInfo);
                return;
            }
        );
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
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "1XDN:protonated"
                ),
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
