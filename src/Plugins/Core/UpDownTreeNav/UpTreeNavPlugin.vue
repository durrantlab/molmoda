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
import { getUpDownTreeNavMoleculesToActOn, toggleUpDownTreeNav } from "./UpDownTreeNavUtils";
import { checkAnyMolLoaded } from "../../CheckUseAllowedUtils";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";

/** UpTreeNavPlugin */
@Options({
    components: {
        PluginComponent,
    },
})
export default class UpTreeNavPlugin extends PluginParentClass {
    menuPath = ["View", "Toggles", "[7] Toggle Up"];
    title = "Toggle Up";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "uptreenav";
    noPopup = true;
    userArgDefaults: UserArg[] = [];

    logJob = false;
    logAnalytics = false;

    intro = "Toggle visibility and focus with the molecule above the selected one.";
    details = "This plugin provides a keyboard-friendly way to navigate through molecules in the 3D viewer.";
    hotkey = "[";
    tags = [Tag.All];

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @returns {Promise<void>}  Resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        const molsToActOn = getUpDownTreeNavMoleculesToActOn();

        if (
            molsToActOn.molBefore === null ||
            molsToActOn.molToConsider === null
        ) {
            return Promise.resolve();
        }

        toggleUpDownTreeNav(molsToActOn.molBefore, molsToActOn.molToConsider);

        return Promise.resolve();
    }

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
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest}  The selenium test commands.
     */
    async getTests(): Promise<ITest> {
        return {
            beforePluginOpens: () => new TestCmdList()
                .loadExampleMolecule(true)
                .selectMoleculeInTree("Compounds"),
            afterPluginCloses: () => new TestCmdList().waitUntilRegex(
                "#navigator",
                'class=.title selected.[^>]+?data-label=.Protein.'
            ),
        };
    }
}
</script>

<style scoped lang="scss"></style>
