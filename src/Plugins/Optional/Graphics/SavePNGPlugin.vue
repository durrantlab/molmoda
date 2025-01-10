<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        actionBtnTxt="Save"
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"
    ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import * as api from "@/Api";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { UserArg, IUserArgText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import {
    fileNameFilter,
    matchesFilename,
} from "@/FileSystem/FilenameManipulation";
import { TestCmdList } from "@/Testing/TestCmdList";
import { dynamicImports } from "@/Core/DynamicImports";
import { Tag } from "@/Plugins/Tags/Tags";
import { checkAnyMolLoaded } from "@/Plugins/CheckUseAllowedUtils";

/**
 * SavePNGPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class SavePNGPlugin extends PluginParentClass {
    menuPath = "File/Graphics/PNG...";
    title = "Save a PNG Image";
    softwareCredits: ISoftwareCredit[] = [dynamicImports.mol3d.credit];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "savepng";

    intro = `Save the current view as a PNG file.`;
    tags = [Tag.Visualization];

    userArgDefaults: UserArg[] = [
        {
            id: "filename",
            label: "",
            val: "",
            placeHolder: "Filename (e.g., my_image.png)...",
            description: `The name of the PNG file to save. The extension ".png" will be automatically appended.`,
            filterFunc: (filename: string): string => {
                return fileNameFilter(filename);
            },
            validateFunc: (filename: string): boolean => {
                return matchesFilename(filename);
            },
        } as IUserArgText,
    ];

    

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
     * @param {any} parameters  Information about the PNG file to save.
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    async runJobInBrowser(parameters: any): Promise<void> {
        let filename = parameters.filename;
        // if (api.visualization.viewerObj === undefined) {
        //     throw new Error("No viewer to save.");
        // }
        const viewer = await api.visualization.viewer;
        const pngUri = await viewer.pngURI();
        api.fs.savePngUri(filename, pngUri as string);
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
                "Job savepng.*? ended"
            ),
        };
    }
}
</script>

<style scoped lang="scss"></style>
