<template>
    <PluginComponent
        :userArgs="userArgs"
        v-model="open"
        title="Settings"
        actionBtnTxt="Save"
        :intro="intro"
        @onPopupDone="onPopupDone"
        :pluginId="pluginId"
        ref="pluginComponent"
    >
        <!-- cancelBtnTxt="Done" -->
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import {
    FormElement,
    IFormNumber,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    ISoftwareCredit,
    IContributorCredit,
} from "@/Plugins/PluginInterfaces";
import {
    applySettings,
    defaultSettings,
    getSettings,
    saveSettings,
} from "./LoadSaveSettings";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { TestCmdList } from "@/Testing/TestCmdList";

/** SettingsPlugin */
@Options({
    components: {
        PluginComponent,
    },
})
export default class SettingsPlugin extends PluginParentClass {
    menuPath = ["[3] Biotite", "[2] Settings"];
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Jacob D. Durrant",
            url: "http://durrantlab.com/",
        },
    ];
    pluginId = "settings";
    intro = `Modify Biotite general settings.`;

    userArgs: FormElement[] = [
        {
            // type: FormElemType.Number,
            id: "maxProcs",
            label: "Maximum number of available processors",
            val: 0,
        } as IFormNumber,
        {
            id: "initialCompoundsVisible",
            label: "Molecules initially visible",
            val: 10,
            description:
                "Number of molecules initially visible when creating/loading many new molecules.",
        } as IFormNumber,
        // {
        //     type: FormElemType.Select,
        //     id: "molViewer",
        //     label: "Molecular viewer library",
        //     val: "3dmol",
        //     enabled: false,
        //     description: "Only 3Dmol.js is currently supported.",
        //     options: [
        //         {
        //             val: "3dmol",
        //             description: "3Dmol.js",
        //         } as IFormOption,
        //         {
        //             val: "ngl",
        //             description: "NGL Viewer",
        //         } as IFormOption,
        //     ],
        // } as IFormSelect,
    ];
    alwaysEnabled = true;
    logJob = false;

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     */
    onBeforePopupOpen() {
        // Get values from localstorage.
        let updatedUserVals: IUserArg[] = [];

        const savedSettings = getSettings();
        const maxProcs = savedSettings.filter(
            (setting) => setting.name === "maxProcs"
        )[0]?.val;
        const initialCompoundsVisible = savedSettings.filter(
            (setting) => setting.name === "initialCompoundsVisible"
        )[0]?.val;
        const molViewer = savedSettings.filter(
            (setting) => setting.name === "molViewer"
        )[0]?.val;

        const defaults = defaultSettings();

        // Update the userArgs with the saved values.
        updatedUserVals.push({
            name: "maxProcs",
            val: maxProcs ? parseInt(maxProcs) : defaults.maxProcs,
        });
        updatedUserVals.push({
            name: "initialCompoundsVisible",
            val: initialCompoundsVisible
                ? parseInt(initialCompoundsVisible)
                : defaults.initialCompoundsVisible,
        });
        updatedUserVals.push({
            name: "molViewer",
            val: molViewer ? molViewer : defaults.molViewer,
        });

        this.updateUserArgs(updatedUserVals);
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     *
     * @param {IUserArg[]} userArgs  The user arguments.
     */
    onPopupDone(userArgs: IUserArg[]) {
        this.submitJobs([userArgs]);
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @param {IUserArg[]} args  The user arguments to pass to the "executable."
     */
    runJobInBrowser(args: IUserArg[]) {
        saveSettings(args);
        applySettings(args);
        return;
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium tests commands.
     */
    getTests(): ITest[] {
        return [
            {
                closePlugin: new TestCmdList().click(
                    "#modal-settings .cancel-btn"
                ).cmds,
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
