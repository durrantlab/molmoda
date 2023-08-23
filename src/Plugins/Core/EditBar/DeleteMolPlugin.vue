<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        actionBtnTxt="Delete"
        @onPopupDone="onPopupDone"
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

import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { getDefaultNodeToActOn, setNodesToActOn } from "./EditBarUtils";
import { checkAnyMolSelected } from "../CheckUseAllowedUtils";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";

/**
 * DeleteMolPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class DeleteMolPlugin extends PluginParentClass {
    menuPath = ["Edit", "Molecules", "[3] Delete..."];
    title = "Delete Molecule";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "deletemol";
    intro = "Delete the selected molecule(s)?";
    userArgDefaults: UserArg[] = [];

    nodesToActOn = new TreeNodeList([getDefaultNodeToActOn()]);
    alwaysEnabled = true;
    logJob = false;
    hotkey = ["backspace", "delete"];

    /**
     * Runs before the popup opens. Will almost always need this, so requiring
     * children to define it.
     */
    onBeforePopupOpen(): void {
        setNodesToActOn(this);
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
     * Every plugin runs some job. This is the function that does the job running.
     */
    runJobInBrowser() {
        if (this.nodesToActOn) {
            const treeNodeList = this.$store.state.molecules as TreeNodeList;

            this.nodesToActOn.forEach((node) => {
                treeNodeList.removeNode(node);
            });

            // Get the parent node and remove this from it's nodes.
            // if (this.nodeToActOn.parentId) {
            //   const parentNode = getNodeOfId(
            //     this.nodeToActOn.parentId,
            //     this.$store.state.molecules
            //   );

            //   if (parentNode) {
            //     parentNode.viewerDirty = true;

            //     // Remove this node from the parent's nodes list.
            //     if (parentNode.nodes) {
            //       parentNode.nodes = parentNode.nodes.fidlter(
            //         (n) => n.id !== this.nodeToActOn?.id
            //       );
            //     }
            //   }
            // } else {
            //   // It's a root node, without a parent id.
            //   let molecules = this.$store.state.molecules;
            //   molecules = molecules.filter(
            //     (n: TreeNode) => n.id !== this.nodeToActOn?.id
            //   );
            //   this.$store.commit("updateMolecules", molecules);
            // }
        }

        return;
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    getTests(): ITest[] {
        return [
            // Test deleting a child node.
            {
                beforePluginOpens: new TestCmdList()
                    .loadExampleProtein(true)
                    .selectMoleculeInTree("Protein").cmds,
                afterPluginCloses: new TestCmdList().wait(1).cmds,
            },
            // Also test deleting a root node.
            {
                beforePluginOpens: new TestCmdList()
                    .loadExampleProtein(true)
                    .selectMoleculeInTree("4WP4").cmds,
                afterPluginCloses: new TestCmdList().wait(1).cmds,
            },
        ];
    }
}
</script>

<style scoped lang="scss"></style>
