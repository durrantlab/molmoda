<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        actionBtnTxt="Delete"
        @onPopupDone="onPopupDone"
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

import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { getDefaultNodeToActOn, setNodesToActOn } from "./EditBarUtils";
import { checkAnyMolSelected } from "../../CheckUseAllowedUtils";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { Tag } from "@/Plugins/Tags/Tags";

/**
 * DeleteMolPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class DeleteMolPlugin extends PluginParentClass {
    menuPath = ["Navigator", "Molecules", "[3] Delete..."];
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
    tags = [Tag.All];

    nodesToActOn = new TreeNodeList([getDefaultNodeToActOn()]);
    
    logJob = false;
    hotkey = ["backspace", "delete"];

    /**
     * Runs before the popup opens. Will almost always need this, so requiring
     * children to define it.
     *
     * @param {any} payload  The payload (node id)
     */
    async onBeforePopupOpen(payload: any) {
        setNodesToActOn(this, payload);
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
    async runJobInBrowser(): Promise<void> {
        if (this.nodesToActOn) {
            const treeNodeList = this.$store.state.molecules as TreeNodeList;

            this.nodesToActOn.forEach((node) => {
                treeNodeList.removeNode(node);

                // // Mark parent as dirty to trigger rerender
                // if (node.parentTreeNode) {
                //     node.parentTreeNode.viewerDirty = true;
                // } else {
                //     // It's a root node, without a parent id.
                // }
            });

            // const viewer = await visualizationApi.viewer;
            // viewer.renderAll();

            // this.$store.commit("updateMolecules", treeNodeList);

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

        return Promise.resolve();
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
            // Test deleting a child node.
            {
                beforePluginOpens: new TestCmdList()
                    .loadExampleMolecule(true)
                    .selectMoleculeInTree("Protein"),

                // Also test clicking on the navigator to delete.
                afterPluginCloses: new TestCmdList()
                    .wait(2)

                    // Also check clicking in title bar
                    .selectMoleculeInTree("Compounds")
                    .click('#navigator div[data-label="Compounds"] span.delete')
                    .pressPopupButton(".action-btn", this.pluginId)
                    .wait(2)

                    // Also check pressing backspace
                    .selectMoleculeInTree("Solvent")
                    .text("body", "BACKSPACE")
                    .pressPopupButton(".action-btn", this.pluginId)
                    .wait(2)
                    .waitUntilNotRegex("#navigator", "Compounds")
                    .waitUntilNotRegex("#navigator", "Solvent"),
            },
            // Also test deleting a root node.
            {
                beforePluginOpens: new TestCmdList()
                    .loadExampleMolecule(true)
                    .selectMoleculeInTree("4WP4"),
            },
        ];
    }
}
</script>

<style scoped lang="scss"></style>
