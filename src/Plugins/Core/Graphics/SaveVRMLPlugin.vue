<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        actionBtnTxt="Save"
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
    ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import * as api from "@/Api";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { checkAnyMolLoaded } from "../CheckUseAllowedUtils";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { UserArg, IUserArgText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import {
    fileNameFilter,
    matchesFilename,
} from "@/FileSystem/FilenameManipulation";
import { FileInfo } from "@/FileSystem/FileInfo";
import { correctFilenameExt } from "@/FileSystem/Utils";
import { TestCmdList } from "@/Testing/TestCmdList";
import { dynamicImports } from "@/Core/DynamicImports";

/**
 * SaveVRMLPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class SaveVRMLPlugin extends PluginParentClass {
    menuPath = "File/Graphics/VRML...";
    title = "Save a VRML Model";
    softwareCredits: ISoftwareCredit[] = [dynamicImports.mol3d.credit];
    contributorCredits: IContributorCredit[] = [
        // {
        //   name: "Jacob D. Durrant",
        //   url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "savevrml";

    intro = `Save the current molecular scene as a VRML file (3D model).`;

    userArgDefaults: UserArg[] = [
        {
            id: "filename",
            label: "",
            val: "",
            placeHolder: "Filename (e.g., my_model.vrml)...",
            description: `The name of the VRML file to save. The extension ".vrml" will be automatically appended.`,
            filterFunc: (filename: string): string => {
                return fileNameFilter(filename);
            },
            validateFunc: (filename: string): boolean => {
                return matchesFilename(filename);
            },
        } as IUserArgText,
    ];

    alwaysEnabled = true;

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        return checkAnyMolLoaded();
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
        this.submitJobs([{ filename: this.getUserArg("filename") }]);
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @param {any} parameters  Information about the VRML file to save.
     */
    async runJobInBrowser(parameters: any): Promise<any> {
        let filename = parameters.filename;
        const viewer = await api.visualization.viewer;
        let vrmlTxt = viewer.exportVRML();
        viewer.renderAll();

        // If fileame doesn't end in vrml (case insensitive), end it.
        filename = correctFilenameExt(filename, "vrml");

        if (vrmlTxt !== "") {
            api.fs.saveTxt(
                new FileInfo({
                    name: filename,
                    contents: vrmlTxt,
                })
            );
        }

        return;
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest}  The selenium test commands.
     */
    async getTests(): Promise<ITest> {
        return {
            beforePluginOpens: new TestCmdList().loadExampleMolecule(),
            pluginOpen: new TestCmdList().setUserArg(
                "filename",
                "test",
                this.pluginId
            ),
            afterPluginCloses: new TestCmdList().waitUntilRegex(
                "#log",
                "Job savevrml.*? ended"
            ),
        };
    }
}
</script>

<style scoped lang="scss"></style>
