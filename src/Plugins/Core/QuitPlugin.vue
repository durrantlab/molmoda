<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options } from "vue-class-component";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { appName } from "@/Core/GlobalVars";
import { closeDownApp } from "@/Core/Utils/CloseAppUtils";
import * as api from "@/Api";
import { YesNo } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import { Tag } from "./ActivityFocus/ActivityFocusUtils";
import { detectPlatform, HostOs } from "@/Core/HostOs";

/** QuitPlugin */
@Options({
    components: {
        PluginComponent,
    },
})
export default class QuitPlugin extends PluginParentClass {
    menuPath = detectPlatform() === HostOs.Mac ? [appName, "[9]", "[9] Quit"] : ["File", "[9]", "[9] Exit"];
    title = "Quit";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "quitplugin";
    noPopup = true;
    userArgDefaults: UserArg[] = [];

    logJob = false;
    intro = "Quits " + appName + ".";
    details = "This plugin provides allows the user to save their work before closing the application.";
    tags = [Tag.All];
    skipLongRunningJobMsg = true;

    // hotkey = "i";

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @returns {Promise<void>}  Resolves when the job is done.
     */
    async runJobInBrowser(): Promise<void> {
        if (this.$store.state.molecules.length === 0) {
            closeDownApp();
            return Promise.resolve();
        }

        // There are some molecules, so you need to prompt to save them. This
        // servers the same role as the alert that popups up when user closes
        // the tab, but here we can be more elegant about it.
        const resp = await api.messages.popupYesNo(
            "Would you like to save your session before quitting?",
            "Save Before Quitting?",
            "Save",
            "Don't Save",
            true
        );

        // Note that if Cancel, does nothing.
        if (resp === YesNo.Yes) {
            api.plugins.runPlugin("savemolecules", true);
        } else if (resp === YesNo.No) {
            closeDownApp();
        }

        return Promise.resolve();
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        return [
            // Test cancel button
            {
                beforePluginOpens: () => new TestCmdList().loadExampleMolecule(true),
                closePlugin: () => new TestCmdList().click("#modal-yesnomsg .cancel-btn")
            },
            // Test don't save button
            {
                beforePluginOpens: () => new TestCmdList().loadExampleMolecule(true),
                closePlugin: () => new TestCmdList().click("#modal-yesnomsg .action-btn"),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex("#modal-simplemsg", "You may now close")
                //new TestCmdList().click("#modal-statcollection .action-btn") // .click("#modal-simplemsg .cancel-btn")
            },
            // Test the save button
            {
                beforePluginOpens: () => new TestCmdList().loadExampleMolecule(true),
                closePlugin: () => new TestCmdList().click("#modal-yesnomsg .action-btn2"),
                afterPluginCloses: () => new TestCmdList()
                    .wait(1.5)
                    .text("#modal-savemolecules #filename-savemolecules-item", "tmpfile")
                    .click("#modal-savemolecules .action-btn")
                    .waitUntilRegex("#modal-simplemsg", "You may now close")
                // .click("#modal-simplemsg .cancel-btn")
            },
            // Test on empty project
            {
                closePlugin: () => new TestCmdList().waitUntilRegex("#modal-simplemsg", "You may now close")
                // .click("#modal-simplemsg .cancel-btn") // .click("#modal-yesnomsg .action-btn2"),
                // afterPluginCloses: () => new TestCmdList()
                //     .click("#modal-simplemsg .cancel-btn")
            },

        ];
    }
}
</script>

<style scoped lang="scss"></style>
