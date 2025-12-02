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
// import { SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
// import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { checkAnyMolLoaded } from "../CheckUseAllowedUtils";
import { TestCmdList } from "@/Testing/TestCmdList";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { selectNodesBasedOnCondition } from "@/UI/Navigation/TreeView/TreeUtils";

/** SelectVisiblePlugin */
@Options({
    components: {
        PluginComponent,
    },
})
export default class SelectVisiblePlugin extends PluginParentClass {
    menuPath = ["Edit", "Selection", "[1] Select Visible"];
    title = "Select Visible";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "selectvisible";
    noPopup = true;
    userArgDefaults: UserArg[] = [];
    logJob = false;
    logAnalytics = false;
    intro = "Select all visible molecules.";
    details = "This plugin selects all molecules that are currently visible in the viewer and deselects those that are hidden.";
    tags = [Tag.All];

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @returns {Promise<void>}  Resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        selectNodesBasedOnCondition(
            this.$store.state["molecules"],
            (n) => n.visible
        );
        return Promise.resolve();
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
     * @returns {ITest}  The selenium test commands.
     */
    async getTests(): Promise<ITest> {
        return {
            beforePluginOpens: () => new TestCmdList().loadExampleMolecule(true),
        };
    }
}
</script>
<style scoped lang="scss"></style>