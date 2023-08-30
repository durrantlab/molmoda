<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        actionBtnTxt="Save"
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
    >
        <!-- cancelBtnTxt="Done" -->
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import {
    UserArg,
    IUserArgNumber,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
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
    menuPath = ["[3] Biotite", "[2] Settings..."];
    title = "Settings";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "settings";
    intro = `Modify Biotite general settings.`;

    userArgDefaults: UserArg[] = [
        {
            // type: UserArgType.Number,
            id: "maxProcs",
            label: "Maximum number of available processors",
            val: 0,
        } as IUserArgNumber,
        {
            id: "initialCompoundsVisible",
            label: "Molecules initially visible",
            val: 10,
            description:
                "Number of molecules initially visible when creating/loading many new molecules.",
        } as IUserArgNumber,
        // {
        //     type: UserArgType.Select,
        //     id: "molViewer",
        //     label: "Molecular viewer library",
        //     val: "3dmol",
        //     enabled: false,
        //     description: "Only 3Dmol.js is currently supported.",
        //     options: [
        //         {
        //             val: "3dmol",
        //             description: "3Dmol.js",
        //         } as IUserArgOption,
        //         {
        //             val: "ngl",
        //             description: "NGL Viewer",
        //         } as IUserArgOption,
        //     ],
        // } as IUserArgSelect,
    ];
    alwaysEnabled = true;
    logJob = false;

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     */
    onBeforePopupOpen() {
        // Get values from localstorage.
        const savedSettings = getSettings();
        const maxProcs = savedSettings.filter(
            (setting) => setting.id === "maxProcs"
        )[0]?.val;
        const initialCompoundsVisible = savedSettings.filter(
            (setting) => setting.id === "initialCompoundsVisible"
        )[0]?.val;
        const molViewer = savedSettings.filter(
            (setting) => setting.id === "molViewer"
        )[0]?.val;

        const defaults = defaultSettings();

        // Update the userArgs with the saved values.
        this.setUserArg(
            "maxProcs",
            maxProcs ? parseInt(maxProcs as string) : defaults.maxProcs
        );
        this.setUserArg(
            "initialCompoundsVisible",
            initialCompoundsVisible
                ? parseInt(initialCompoundsVisible as string)
                : defaults.initialCompoundsVisible
        );
        this.setUserArg(
            "molViewer",
            molViewer ? molViewer : defaults.molViewer
        );
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
        // Putting in [] so all settings sent together, rather than one-by-one.
        this.submitJobs([this.userArgs]);
    }

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @param {UserArg[]} args  The user arguments to pass to the "executable."
     */
    async runJobInBrowser(args: UserArg[]) {
        // Keeping only id and val.
        args = args.map((arg) => {
            return {
                id: arg.id,
                val: arg.val as any,
            };
        });

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
                )
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
