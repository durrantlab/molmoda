<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TestCmdList } from "@/Testing/TestCmdList";
import { checkAnyMolLoaded } from "../../CheckUseAllowedUtils";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { toggleVisibilityWithConfirmation } from "@/UI/Navigation/TreeView/TreeUtils";
import { Component } from "vue-facing-decorator";
import { IContributorCredit, ISoftwareCredit } from "@/Plugins/PluginInterfaces";
/**
 * ToggleVisiblePlugin
 */
@Component({
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
        // Shared setup for the confirmation-dialog tests: load >50 molecules,
        // select them all, then run the toggle once to hide everything. The
        // test-under-examination's menu click then attempts to make them
        // visible again, which exceeds the visibility threshold and triggers
        // the "Performance Warning" YesNo popup.
        //
        // We pass expandInMoleculeTree=false to loadExampleMolecule because
        // its default expand-path waits for "Protein" to appear in the
        // navigator, which never happens for a pure SMILES file. We assert
        // against the first loaded compound by data-label instead; the
        // SMILES loader names terminals "(frame1) over_50_mols", "(frame2) over_50_mols", etc.
        const hideManyLabel = "(frame1) over_50_mols";
        const setupToHideMany = () =>
            new TestCmdList()
                .loadExampleMolecule(false, "testmols/over_50_mols.smi")
                // Wait for the first molecule's row to render and be visible
                // before proceeding.
                .waitUntilRegex(
                    `#navigator div[data-label="${hideManyLabel}"]`,
                    'data-icon="eye"'
                )
                .openPlugin("selectall")
                // After selectall, hide everything via this plugin. Going
                // visible -> hidden never triggers the confirmation popup,
                // so this completes silently.
                .openPlugin(this.pluginId)
                // Wait until the first molecule is actually hidden before
                // proceeding, otherwise the test-under-examination's menu
                // click can race the toggle.
                .waitUntilRegex(
                    `#navigator div[data-label="${hideManyLabel}"]`,
                    // 'data-icon="eye-slash"'
                    'lightgray'
                );
        const confirmVisibilityTest: ITest = {
            name: "Confirm making many molecules visible",
            beforePluginOpens: setupToHideMany,
            afterPluginCloses: () =>
                new TestCmdList()
                    .waitUntilRegex("#modal-yesnomsg", "performance")
                    // action-btn2 is the "Yes, Continue" button (yesBtnTxt is
                    // bound to actionBtnTxt2 in YesNoPlugin).
                    .click("#modal-yesnomsg .action-btn2")
                    .waitUntilNotRegex("body", 'class="modal-open"')
                    // The trailing double-quote anchors the match so "eye"
                    // does not also match "eye-slash".
                    .waitUntilNotRegex(
                        `#navigator div[data-label="${hideManyLabel}"] .visible-icon`,
                        // 'svg.+?data-icon="eye"'
                        'lightgray'  // *****
                    ),
        };
        const cancelVisibilityTest: ITest = {
            name: "Cancel making many molecules visible",
            beforePluginOpens: setupToHideMany,
            afterPluginCloses: () =>
                new TestCmdList()
                    .waitUntilRegex("#modal-yesnomsg", "performance")
                    // action-btn is the "Cancel"/no button. popupYesNo is
                    // invoked without showCancelBtn=true, so the dedicated
                    // cancel button is hidden and the no-button (styled as
                    // cancel) carries the "Cancel" label. Clicking it
                    // returns YesNo.No, which skips the toggle.
                    .click("#modal-yesnomsg .action-btn")
                    .waitUntilNotRegex("body", 'class="modal-open"')
                    // Molecule should remain hidden since the user canceled.
                    .waitUntilRegex(
                        `#navigator div[data-label="${hideManyLabel}"]`,
                        // 'svg.+?data-icon="eye-slash"'
                        'lightgray'
                    ),
        };
        const defaultToggleTest: ITest = {
            name: "Default toggle behavior",
            beforePluginOpens: () =>
                new TestCmdList()
                    .loadExampleMolecule(true)
                    .selectMoleculeInTree("Protein"),
            afterPluginCloses: () =>
                new TestCmdList()
                    // It starts visible (fa-eye), after toggle it should be invisible (fa-eye-slash)
                    .waitUntilRegex(
                        '#navigator div[data-label="Protein"]',
                        'svg.+?data-icon="eye-slash"'
                    ),
        };
        return [defaultToggleTest, confirmVisibilityTest, cancelVisibilityTest];
    }
}
</script>

<style scoped lang="scss"></style>
