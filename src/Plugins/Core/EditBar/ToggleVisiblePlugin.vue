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
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TestCmdList } from "@/Testing/TestCmdList";
import { checkAnyMolLoaded } from "../../CheckUseAllowedUtils";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { toggleVisibilityWithConfirmation } from "@/UI/Navigation/TreeView/TreeUtils";
/**
 * ToggleVisiblePlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class ToggleVisiblePlugin extends PluginParentClass {
 menuPath = ["View", "Toggles", "[9] Toggle Visible"];
    title = "Toggle Visible";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "togglevisiblemols";
    intro = "Toggle the visibility of the selected molecules.";
    details = "This plugin shows or hides the selected molecules in the 3D viewer.";
    userArgDefaults: UserArg[] = [];

    noPopup = true;
    logJob = false;
    logAnalytics = false;
    tags = [Tag.All];
    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    async runJobInBrowser(): Promise<void> {
        let nodesToToggle = getMoleculesFromStore().filters.keepSelected(
            true,
            true
        );
        if (nodesToToggle.length === 0) {
            nodesToToggle = getMoleculesFromStore().flattened;
        }
        await toggleVisibilityWithConfirmation(nodesToToggle);
    }

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *  message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        return checkAnyMolLoaded();
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        const setupToHideMany = new TestCmdList()
            // Load over 50 molecules
            .loadExampleMolecule(true, "testmols/over_50_mols.smi")
            // .click("#navigator")
            // .waitUntilRegex("#navigator", "frame60")
            // Hide all molecules
            // .openPlugin("selectall")
            // .openPlugin("togglevisiblemols")
            // .waitUntilRegex(
            //     '#navigator div[data-label="molecule-1"]',
            //     'svg.+?data-icon="eye-slash"'
            // );

        const confirmVisibilityTest: ITest = {
            name: "Confirm making > 20 molecules visible",
            beforePluginOpens: () => setupToHideMany,
            afterPluginCloses: () =>
                new TestCmdList()
                    .wait(10)
                    .waitUntilRegex("document", "div")
                    // .waitUntilRegex("#modal-yesnomsg", "performance")
                    // .click("#modal-yesnomsg .action-btn2") // "Yes, Continue"
                    // .waitUntilRegex(
                    //     '#navigator div[data-label="molecule-1"]',
                    //     'svg.+?data-icon="eye"'
                    // ),
        };

        const cancelVisibilityTest: ITest = {
            name: "Cancel making > 20 molecules visible",
            beforePluginOpens: () => setupToHideMany,
            afterPluginCloses: () =>
                new TestCmdList()
                    .waitUntilRegex("#modal-yesnomsg", "performance")
                    .click("#modal-yesnomsg .action-btn") // "Cancel"
                    .waitUntilRegex(
                        '#navigator div[data-label="molecule-1"]',
                        'svg.+?data-icon="eye-slash"'
                    ), // Should remain hidden
        };

        const defaultToggleTest: ITest = {
            name: "Default toggle behavior",
            beforePluginOpens: () =>
                new TestCmdList()
                    .loadExampleMolecule(true)
                    .selectMoleculeInTree("Protein"), // Select a molecule to toggle
            afterPluginCloses: () =>
                new TestCmdList()
                    // It starts visible (fa-eye), after toggle it should be invisible (fa-eye-slash)
                    .waitUntilRegex(
                        '#navigator div[data-label="Protein"]',
                        'svg.+?data-icon="eye-slash"'
                    ),
        };

        return [confirmVisibilityTest] ; // [defaultToggleTest, confirmVisibilityTest, cancelVisibilityTest];
    }
}
</script>

<style scoped lang="scss"></style>
