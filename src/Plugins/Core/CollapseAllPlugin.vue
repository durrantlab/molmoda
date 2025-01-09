<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"
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
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { TestCmdList } from "@/Testing/TestCmdList";
import { checkAnyMolLoaded } from "./CheckUseAllowedUtils";
import { Tag } from "../Tags/Tags";

/** CollapseAllPlugin */
@Options({
    components: {
        PluginComponent,
    },
})
export default class CollapseAllPlugin extends PluginParentClass {
    menuPath = ["Navigator", "Tree", "[2] Collapse All"];
    title = "";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "collapseall";
    noPopup = true;
    userArgDefaults: UserArg[] = [];
    
    logJob = false;
    intro = "Collapse all the nodes in the Navigator panel.";
    tags = [Tag.All];

    // hotkey = "i";

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @returns {Promise<void>}  Resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        const allNodes = (this.$store.state["molecules"] as TreeNodeList)
            .flattened;
        allNodes.forEach((n) => {
            n.treeExpanded = false;
        });
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
            beforePluginOpens: new TestCmdList().loadExampleMolecule(true),
        };
    }
}
</script>

<style scoped lang="scss"></style>
