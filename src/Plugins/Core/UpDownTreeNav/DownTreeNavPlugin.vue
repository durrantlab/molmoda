<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onUserArgChanged="onUserArgChanged"
    ></PluginComponent>
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
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { getUpDownTreeNavMoleculesToActOn, toggleUpDownTreeNav } from "./UpDownTreeNavUtils";
import { checkAnyMolLoaded } from "../CheckUseAllowedUtils";
import { Tag } from "@/Plugins/Tags/Tags";

/** DownTreeNavPlugin */
@Options({
    components: {
        PluginComponent,
    },
})
export default class DownTreeNavPlugin extends PluginParentClass {
    menuPath = ["Navigator", "[6] Toggles", "[8] Toggle Down"];
    title = "";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "downtreenav";
    noPopup = true;
    userArgDefaults: UserArg[] = [];
    
    logJob = false;
    intro = "Toggle visibility and focus with the molecule below the selected one.";
    hotkey = "]";
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
            molsToActOn.molAfter === null ||
            molsToActOn.molToConsider === null
        ) {
            return Promise.resolve();
        }

        toggleUpDownTreeNav(molsToActOn.molAfter, molsToActOn.molToConsider);
        
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
        alert("FIX THIS");
        return {
            beforePluginOpens: new TestCmdList().loadExampleMolecule(true),
        };
    }
}
</script>

<style scoped lang="scss"></style>
