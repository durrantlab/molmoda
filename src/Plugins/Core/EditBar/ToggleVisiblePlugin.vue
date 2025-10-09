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
import { checkAnyMolSelected } from "../../CheckUseAllowedUtils";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";

/**
 * ToggleVisiblePlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class ToggleVisiblePlugin extends PluginParentClass {
    menuPath = ["Edit", "Molecules", "[6] Toggle Visible"];
    title = "Toggle Visible";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "togglevisiblemols";
    intro = "Toggle the visibility of the selected molecules.";
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
    runJobInBrowser(): Promise<void> {
        let selecteds = getMoleculesFromStore().filters.keepSelected(
            true,
            true
        );

        if (selecteds.length === 0) {
            selecteds = getMoleculesFromStore().flattened;
        }

        selecteds.forEach((node) => {
            node.visibleWithoutChildren = !node.visible;
            node.viewerDirty = true;
        });

        // How many of these are visible?
        // const numVisible = selecteds.filters.keepVisible(true, false).length;
        // const numNotvisible = selecteds.length - numVisible;

        // if (numVisible > numNotvisible) {
        //     // Set them to be invisible
        //     selecteds.forEach((node) => {
        //         node.visible = false;
        //         node.viewerDirty = true;
        //     });
        // } else {
        //     // Set them to be visible
        //     selecteds.forEach((node) => {
        //         node.visible = true;
        //         node.viewerDirty = true;
        //     });
        // }

        return Promise.resolve();
    }

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        return checkAnyMolSelected();
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
            {
                beforePluginOpens: () => new TestCmdList()
                    .loadExampleMolecule(true)
                    .selectMoleculeInTree("Protein"), // Select a molecule to toggle
                afterPluginCloses: () => new TestCmdList()
                    // It starts visible (fa-eye), after toggle it should be invisible (fa-eye-slash)
                    .waitUntilRegex(
                        '#navigator div[data-label="Protein"]',
                        'svg.+?data-icon="eye-slash"'
                    ),
            },
        ];
    }
}
</script>

<style scoped lang="scss"></style>
