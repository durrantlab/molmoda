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
import { SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { checkAnyMolLoaded } from "../CheckUseAllowedUtils";
import { TestCmdList } from "@/Testing/TestCmdList";
import { Tag } from "./ActivityFocus/ActivityFocusUtils";

/** SelectInvertPlugin */
@Options({
    components: {
        PluginComponent,
    },
})
export default class SelectInvertPlugin extends PluginParentClass {
    menuPath = ["Edit", "Selection", "[2] Invert Selection"];
    title = "Invert Selection";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "selectinverse";
    noPopup = true;
    userArgDefaults: UserArg[] = [];

    logJob = false;
    logAnalytics = false;
    intro = "Invert which molecules are selected in the tree.";
    details = "This plugin deselects all currently selected items and selects all unselected items.";
    tags = [Tag.All];
    hotkey = "i";

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
            if (n.selected === SelectedType.False)
                n.selected = SelectedType.True;
            else n.selected = SelectedType.False;
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
            beforePluginOpens: () => new TestCmdList().loadExampleMolecule(true),
        };
    }
}
</script>

<style scoped lang="scss"></style>
