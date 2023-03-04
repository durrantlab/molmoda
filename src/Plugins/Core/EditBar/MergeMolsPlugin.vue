<template>
    <PluginComponent
        ref="pluginComponent"
        v-model="open"
        title="Merge Molecules"
        :intro="intro"
        actionBtnTxt="Merge"
        :userArgs="userArgs"
        :pluginId="pluginId"
        @onPopupDone="onPopupDone"
    ></PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options } from "vue-class-component";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";

import { mergeTreeNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { getDefaultNodeToActOn, setNodesToActOn } from "./EditBarUtils";
import { checkMultipleMolsSelected } from "../CheckUseAllowedUtils";
import { FormElement, IFormText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { treeNodeListDeepClone } from "@/TreeNodes/Deserializers";
import { TestCmdList } from "@/Testing/TestCmdList";

/**
 * MergeMolsPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class MergeMolsPlugin extends PluginParentClass {
    menuPath = ["Edit", "Molecules", "[5] Merge..."];
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Jacob D. Durrant",
            url: "http://durrantlab.com/",
        },
    ];
    pluginId = "mergemols";
    intro =
        "The selected molecules will be copied and merged into a single new molecule. Enter the name of the new, merged molecule.";
    userArgs: FormElement[] = [
        {
            id: "newName",
            label: "",
            val: "",
            placeHolder: "Name of new merged molecule",
            validateFunc: (newName: string): boolean => {
                return newName.length > 0;
            },
        } as IFormText,
    ];

    nodesToActOn = new TreeNodeList([getDefaultNodeToActOn()]);
    alwaysEnabled = true;
    logJob = false;

    /**
     * Runs before the popup opens. Will almost always need this, so requiring
     * children to define it.
     */
    onBeforePopupOpen(): void {
        setNodesToActOn(this, true);

        // Generate the suggested title for merged molecule.
        // Get top of molecule title.
        let titles: string[] = [];
        this.nodesToActOn.forEach((node) => {
            titles.push(
                node
                    .getAncestry(this.$store.state.molecules as TreeNodeList)
                    .get(0).title
            );
        });

        // Keep only unique titles
        titles = titles.filter((title, index) => {
            return titles.indexOf(title) === index;
        });
        titles.sort();

        this.updateUserArgs([
            {
                name: "newName",
                // val: title + ":" + nodeToActOn.title + " (cloned)",
                val: titles.join("-") + " (merged)",
            } as IUserArg,
        ]);
    }

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        return checkMultipleMolsSelected();
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @param {IUserArg[]} userArgs  The user arguments.
     */
    runJobInBrowser(userArgs: IUserArg[]) {
        if (!this.nodesToActOn) {
            // Nothing to do.
            return;
        }

        // We need to collect all the ids of the ones to keep. This includes the
        // ones in this.nodesToActOn, which are terminal nodes. It should also
        // include all their direct ancestors.
        treeNodeListDeepClone(getMoleculesFromStore())
            .then((allNodes: TreeNodeList) => {
                let idsToKeep: string[] = this.nodesToActOn.map((node) => {
                    return node.id;
                });
                this.nodesToActOn.forEach((node) => {
                    node.getAncestry(allNodes).forEach((ancestor) => {
                        if (ancestor.id) {
                            idsToKeep.push(ancestor.id);
                        }
                    });
                });
                idsToKeep = idsToKeep.filter((id, index) => {
                    // only unique
                    return idsToKeep.indexOf(id) === index;
                });
                const onlySelectedTreeNodeList =
                    allNodes.filters.onlyIdsDeep(idsToKeep);

                return mergeTreeNodes(
                    onlySelectedTreeNodeList,
                    this.getArg(userArgs, "newName")
                );
            })
            .then((mergedTreeNode: TreeNode) => {
                this.$store.commit("pushToMolecules", mergedTreeNode);
                return;
            })
            .catch((err) => {
                throw err;
            });

        // debugging below
        // cloneMolsWithAncestry(this.nodesToActOn, true)
        //     .then((treeNodeList: TreeNodeList) => {
        //         return mergeTreeNodes(
        //             treeNodeList,
        //             this.getArg(userArgs, "newName")
        //         );
        //     })
        //     .then((mergedTreeNode: TreeNode) => {
        //         debugger;
        //         this.$store.commit("pushToMolecules", mergedTreeNode);
        //         return;
        //     })
        //     .catch((err) => {
        //         throw err;
        //     });
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    getTests(): ITest[] {
        const beforePluginOpens = new TestCmdList()
            .loadExampleProtein(true)
            .selectMoleculeInTree("Protein")
            .selectMoleculeInTree("Compounds", true);
        
        const afterPluginCloses = new TestCmdList()
            .waitUntilRegex("#navigator", ".merged.");

        return [
            {
                beforePluginOpens: beforePluginOpens.cmds,
                afterPluginCloses: afterPluginCloses.cmds,
            },
        ];
    }
}
</script>

<style scoped lang="scss"></style>
