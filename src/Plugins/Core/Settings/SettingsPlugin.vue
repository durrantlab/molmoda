<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        actionBtnTxt="Save"
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
        :hideIfDisabled="true"
        actionBtnTxt2="Load Defaults"
        @onPopupDone2="setDefaults"
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
import { appName } from "@/Core/GlobalVars";
import { defaults } from "chart.js";

/** SettingsPlugin */
@Options({
    components: {
        PluginComponent,
    },
})
export default class SettingsPlugin extends PluginParentClass {
    menuPath = [`${appName}`, "[2] Settings..."];
    title = "Settings";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "settings";
    intro = `Modify ${appName} general settings.`;

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
            label: "Compounds initially visible",
            val: 50,
            description:
                "Number of compounds initially visible when creating/loading many new compounds.",
        } as IUserArgNumber,
        {
            id: "allowCookies",
            label: "Allow cookies",
            val: false,
            description: `Allow cookies so we can (1) save your user settings and (2) collect usage statistics to help us get grants for continued development.`
        },
        {
            id: "allowCookiesAlert",
            val: `Please allow cookies! They improve the user experience and help us secure much needed funding.`,
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
        const currentVal = this.getUserArg("allowCookies");
        this.setUserArgEnabled("allowCookiesAlert", !currentVal);
    }

    /**
     * Runs when the user changes a user argument.
     */
    async onUserArgChange() {
        const currentStatEnabledVal = this.getUserArg("allowCookies");
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
        const settingsPromises = [getSettings(), defaultSettings()];

        Promise.all(settingsPromises)
        .then(([savedSettings, defaults]) => {
            const maxProcs = savedSettings["maxProcs"];
            const initialCompoundsVisible = savedSettings["initialCompoundsVisible"]
            // const molViewer = savedSettings.filter(
            //     (setting) => setting.id === "molViewer"
            // )[0]?.val;

            // Update the userArgs with the saved values.
            this.setUserArg(
                "maxProcs",
                maxProcs ? maxProcs : defaults.maxProcs
            );
            this.setUserArg(
                "initialCompoundsVisible",
                initialCompoundsVisible
                    ? initialCompoundsVisible
                    : defaults.initialCompoundsVisible
            );
            // this.setUserArg(
            //     "molViewer",
            //     molViewer ? molViewer : defaults.molViewer
            // );

            return isStatCollectionEnabled();
        })
        .then((isSet) => {
            this.setUserArg("allowCookies", isSet);
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
     * Set the default settings.
     */
    async setDefaults() {
        const defaults = await defaultSettings();
        
        for (const setting in defaults) {
            const val = defaults[setting];
            this.setUserArg(setting, val);
        }

        // Also, allow stat collection
        this.setUserArg("allowCookies", true);
        enableStats();
    }

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @param {UserArg[]} args  The user arguments to pass to the "executable."
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    async runJobInBrowser(args: UserArg[]): Promise<void> {
        // Keeping only id and val.
        args = args.map((arg) => {
            return {
                id: arg.id,
                val: arg.val as any,
            };
        });

        await saveSettings(args);
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
    async getTests(): Promise<ITest[]> {
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
