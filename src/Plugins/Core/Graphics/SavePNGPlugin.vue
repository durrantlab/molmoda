<template>
    <PluginComponent
        :userArgs="userArgs"
        v-model="open"
        title="Save a PNG Image"
        actionBtnTxt="Save"
        :intro="intro"
        :pluginId="pluginId"
        @onPopupDone="onPopupDone"
    ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import * as api from "@/Api";
import {
    IContributorCredit,
    ISoftwareCredit,
    Licenses,
} from "@/Plugins/PluginInterfaces";
import { checkAnyMolLoaded } from "../CheckUseAllowedUtils";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { FormElement, IFormText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { ITest } from "@/Testing/TestCmd";
import {
    fileNameFilter,
    matchesFilename,
} from "@/FileSystem/FilenameManipulation";
import { TestCmdList } from "@/Testing/TestCmdList";

/**
 * SavePNGPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class SavePNGPlugin extends PluginParentClass {
    menuPath = "File/Graphics/PNG";
    softwareCredits: ISoftwareCredit[] = [
        {
            name: "3Dmol.js",
            url: "https://3dmol.csb.pitt.edu/",
            license: Licenses.BSD3,
        },
    ];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Jacob D. Durrant",
            url: "http://durrantlab.com/",
        },
    ];
    pluginId = "savepng";

    intro = `Please provide the name of the PNG file to save. The
    extension ".png" will be automatically appended.`;

    userArgs: FormElement[] = [
        {
            id: "filename",
            label: "",
            val: "",
            placeHolder: "Enter Filename (e.g., my_image.png)",
            filterFunc: (filename: string): string => {
                return fileNameFilter(filename);
            },
            validateFunc: (filename: string): boolean => {
                return matchesFilename(filename);
            },
        } as IFormText,
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
     *
     * @param {IUserArg[]} userArgs  The user arguments.
     */
    onPopupDone(userArgs: IUserArg[]) {
        this.submitJobs([{ filename: this.getArg(userArgs, "filename") }]);
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @param {any} parameters  Information about the PNG file to save.
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    runJobInBrowser(parameters: any): Promise<void> {
        let filename = parameters.filename;
        if (api.visualization.viewer === undefined) {
            throw new Error("No viewer to save.");
        }
        return api.visualization.viewer.pngURI().then((pngUri: string) => {
            api.fs.savePngUri(filename, pngUri as string);
            return;
        });
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
            beforePluginOpens: new TestCmdList().loadExampleProtein().cmds,
            pluginOpen: new TestCmdList().setUserArg(
                "filename",
                "test",
                this.pluginId
            ).cmds,
            afterPluginCloses: new TestCmdList()
                .waitUntilRegex("#log", 'Job "savepng:.+?" ended')
                .wait(3).cmds,
        };
    }
}
</script>

<style scoped lang="scss"></style>
