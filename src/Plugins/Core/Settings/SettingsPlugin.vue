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
    IUserArgOption,
    IUserArgSelect,
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
import {
    enableStats,
    isStatCollectionEnabled,
    removeStatCollectionCookie,
} from "../StatCollection/StatUtils";
import { appName } from "@/Core/GlobalVars";
import { restartAutoSaveTimer } from "@/Store/AutoSave";

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
            id: "allowCookies",
            label: "Allow cookies",
            val: false,
            description: `Allow cookies so we can (1) save your user settings and (2) collect usage statistics to help us get grants for continued development.`,
        },
        {
            id: "allowCookiesAlert",
            val: `Please allow cookies! They improve the user experience and help us secure much needed funding.`,
            type: UserArgType.Alert,
            enabled: false,
            alertType: "warning",
        } as IUserArgAlert,
        {
            id: "allowExternalWebAccess",
            label: "Allow access to all external web resources",
            val: false,
            description: `${appName} requires user permission to access external web resources. To avoid having to approve each individually, you may authorize all.`,
        },
        {
            // type: UserArgType.Number,
            id: "maxProcs",
            label: "Maximum number of available processors",
            val: 0,
            description:
                "Maximum number of processors available for any one job.",
        } as IUserArgNumber,
        {
            id: "initialCompoundsVisible",
            label: "Compounds initially visible",
            val: 50,
            description:
                "Number of compounds initially visible when creating/loading many new compounds.",
        } as IUserArgNumber,
        {
            id: "autoSaveFrequencyMinutes",
            label: "Auto save frequency",
            val: 5,
            description:
                "How often (in minutes) to automatically save a backup of your session for emergency recovery. Set to 0 to disable.",
        } as IUserArgNumber,

        // Leaving below because don't want to entirely refactor it out, in case
        // I restore this feature later. But it is never visible (enabled:
        // false).
        {
            type: UserArgType.Select,
            id: "molViewer",
            label: "Molecular viewer library",
            val: "3dmol",
            enabled: false,
            description: "Only 3Dmol.js is currently supported.",
            options: [
                {
                    val: "3dmol",
                    description: "3Dmol.js",
                } as IUserArgOption,
                {
                    val: "ngl",
                    description: "NGL Viewer",
                } as IUserArgOption,
            ],
        } as IUserArgSelect,
    ];
    alwaysEnabled = true;
    logJob = false;

    /**
     * Get the app name.
     *
     * @returns {string}  The app name.
     */
    get appName(): string {
        return appName;
    }

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

        this.setUserArgEnabled("autoSaveFrequencyMinutes", currentStatEnabledVal);

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
    async onBeforePopupOpen() {
        // Get values from localstorage.
        const settingsPromises = [getSettings(), defaultSettings()];

        const [savedSettings, defaults] = await Promise.all(settingsPromises);

        // This settings system is error prone, so I'm going to do some
        // validaton here. Specifically, make sure all the userarg
        // settings are also present in defaults.
        const userArgSettingIds = this.userArgDefaults
            .filter((a) => a.type !== UserArgType.Alert)
            .map((a) => a.id);
        const defaultSettingIds = Object.keys(defaults);

        // Make sure that every userArg setting is also in defaults.
        userArgSettingIds.forEach((id) => {
            if (!defaultSettingIds.includes(id)) {
                throw new Error(
                    `Setting "${id}" is in userArgDefaults but not in defaults. You need to update the defaults.`
                );
            }
        });

        // Now done validating. Continue with setting the values.

        for (const settingName in defaults) {
            const val = savedSettings[settingName];
            this.setUserArg(settingName, val !== undefined ? val : defaults[settingName]);
        }

        // const maxProcs = savedSettings["maxProcs"];
        // const initialCompoundsVisible =
        //     savedSettings["initialCompoundsVisible"];
        // // const molViewer = savedSettings.filter(
        // //     (setting) => setting.id === "molViewer"
        // // )[0]?.val;

        // // Update the userArgs with the saved values.
        // this.setUserArg(
        //     "maxProcs",
        //     maxProcs ? maxProcs : defaults.maxProcs
        // );
        // this.setUserArg(
        //     "initialCompoundsVisible",
        //     initialCompoundsVisible
        //         ? initialCompoundsVisible
        //         : defaults.initialCompoundsVisible
        // );
        // // this.setUserArg(
        // //     "molViewer",
        // //     molViewer ? molViewer : defaults.molViewer
        // // );

        const isSet = await isStatCollectionEnabled();
        this.setUserArg("allowCookies", isSet);
        this.setStatCollectPetition();

        await this.onUserArgChange();
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
        // Putting in [] so all settings sent together, rather than one-by-one.
        this.submitJobs([this.userArgs]);
        restartAutoSaveTimer() 
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
            // Test without cookies enabled
            {
                closePlugin: new TestCmdList()
                    .click("#modal-settings .btn-primary")
                    .waitUntilRegex(
                        "#modal-simplemsg",
                        "Your settings will be lost"
                    ),
            },
            // Test with cookies enabled
            {
                pluginOpen: new TestCmdList().click(
                    "#allowCookies-settings-item"
                ),
                closePlugin: new TestCmdList()
                    .click("#modal-settings .action-btn")
            },
            // Cookies enabled and load defaults
            {
                pluginOpen: new TestCmdList().click(
                    "#allowCookies-settings-item"
                ),
                closePlugin: new TestCmdList()
                    .click("#modal-settings .action-btn2")
                    .wait(5)
                    .click("#modal-settings .action-btn")
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
