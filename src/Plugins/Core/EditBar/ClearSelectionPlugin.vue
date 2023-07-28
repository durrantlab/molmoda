<template>
    <PluginComponent
        v-model="open"
        :title="title"
        :userArgs="userArgs"
        :pluginId="pluginId"
        :intro="intro"
    ></PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options } from "vue-class-component";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { checkAnyMolSelected } from "../CheckUseAllowedUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { TestCmdList } from "@/Testing/TestCmdList";

/** ClearSelectionPlugin */
@Options({
    components: {
        PluginComponent,
    },
})
export default class ClearSelectionPlugin extends PluginParentClass {
    menuPath = ["Edit", "Selection", "[1] Clear Selection"];
    title = "";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "clearselection";
    noPopup = true;
    userArgs: FormElement[] = [];
    alwaysEnabled = true;
    logJob = false;
    intro = "Clear the selection of all molecules."

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
     * Every plugin runs some job. This is the function that does the job running.
     */
    runJobInBrowser() {
        const allNodes = (this.$store.state["molecules"] as TreeNodeList)
            .flattened;
        allNodes.forEach((n) => {
            if (n.selected !== SelectedType.False) {
                n.selected = SelectedType.False;
            }
        });
        return;
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest}  The selenium test commands.
     */
    getTests(): ITest {
        const beforePluginOpens = new TestCmdList()
            .loadExampleProtein(true)
            .selectMoleculeInTree("Protein");

        return {
            beforePluginOpens: beforePluginOpens.cmds,
            closePlugin: [],
            afterPluginCloses: [],
        };
    }
}
</script>

<style scoped lang="scss"></style>
