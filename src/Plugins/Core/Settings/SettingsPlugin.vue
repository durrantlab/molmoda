<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        actionBtnTxt="Save"
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
        :hideIfDisabled="true"
    >
        <!-- cancelBtnTxt="Done" -->
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import {
    UserArg,
    IUserArgNumber,
UserArgType,
IUserArgAlert,
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
import { enableStats, isStatCollectionEnabled, removeStatCollectionCookie } from "../StatCollection/StatUtils";

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
            description: "Maximum number of processors available for any one job.",
        } as IUserArgNumber,
        {
            id: "initialCompoundsVisible",
            label: "Molecules initially visible",
            val: 10,
            description:
                "Number of molecules initially visible when creating/loading many new molecules.",
        } as IUserArgNumber,
        {
            id: "statCollect",
            label: "Collect usage statistics",
            val: false,
            description: "Report statistics on Biotite usage to help the Biotite team get grants for continued development."
        },
        {
            id: "statCollectAlert",
            val: "Please consider allowing us to record limited information about your use of Biotite! These statistics help us secure funding for continued development.",
            type: UserArgType.Alert,
            enabled: false,
            alertType: "warning",
        } as IUserArgAlert
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
     * Set whether the user has allowed stats collection.
     */
    setStatCollectPetition() {
        const currentVal = this.getUserArg("statCollect");
        this.setUserArgEnabled("statCollectAlert", !currentVal);
    }

    /**
     * Runs when the user changes a user argument.
     */
    async onUserArgChange() {
        const currentStatEnabledVal = this.getUserArg("statCollect");
        const savedStatEnabledVal = await isStatCollectionEnabled();

        if (currentStatEnabledVal !== savedStatEnabledVal) {
            if (currentStatEnabledVal) {
                enableStats();
            } else {
                // NOTE: Not disabling, but clearing cookie. So user will have
                // to confirm on next reload.
                removeStatCollectionCookie();
            }
        }
        this.setStatCollectPetition();
    }

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

        isStatCollectionEnabled().then((isSet) => {
            this.setUserArg("statCollect", isSet);
            this.setStatCollectPetition();
            return;
        })
        .catch((err) => {
            throw err;
        });
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
