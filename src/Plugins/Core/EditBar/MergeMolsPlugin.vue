<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        actionBtnTxt="Merge"
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

import { mergeTreeNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { getDefaultNodeToActOn, setNodesToActOn } from "./EditBarUtils";
import { checkMultipleMolsSelected } from "../../CheckUseAllowedUtils";
import { UserArg, IUserArgText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { treeNodeListDeepClone } from "@/TreeNodes/Deserializers";
import { TestCmdList } from "@/Testing/TestCmdList";
import { Tag } from "@/Plugins/Tags/Tags";

/**
 * MergeMolsPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class MergeMolsPlugin extends PluginParentClass {
    menuPath = ["Navigator", "Molecules", "[5] Merge..."];
    title = "Merge Molecules";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "mergemols";
    intro = "Copy and merge the selected molecules into a single new molecule.";
    userArgDefaults: UserArg[] = [
        {
            id: "newName",
            label: "",
            val: "",
            placeHolder: "Name of new merged molecule...",
            description: "The name of the new, merged molecule.",
            validateFunc: (newName: string): boolean => {
                return newName.length > 0;
            },
        } as IUserArgText,
    ];

    nodesToActOn = new TreeNodeList([getDefaultNodeToActOn()]);
    
    logJob = false;
    tags = [Tag.All];

    /**
     * Runs before the popup opens. Will almost always need this, so requiring
     * children to define it.
     * 
     * @param {any} payload  The payload (node id)
     */
    async onBeforePopupOpen(payload: any) {
        setNodesToActOn(this, payload, true);

        // Generate the suggested title for merged molecule.
        // Get top of molecule title.
        let titles: string[] = [];
        this.nodesToActOn.forEach((node) => {
            const title = node
                .getAncestry(this.$store.state.molecules as TreeNodeList)
                .get(0).title;
            titles.push(title);
        });

        // Keep only unique titles
        titles = titles.filter((title, index) => {
            return titles.indexOf(title) === index;
        });
        titles.sort();

        this.setUserArg("newName", titles.join("-") + ":merged");
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
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @returns {Promise<void>}  Resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        if (!this.nodesToActOn) {
            // Nothing to do.
            return Promise.resolve();
        }

        // We need to collect all the ids of the ones to keep. This includes the
        // ones in this.nodesToActOn, which are terminal nodes. It should also
        // include all their direct ancestors.
        return treeNodeListDeepClone(getMoleculesFromStore())
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
                    this.getUserArg("newName")
                );
            })
            .then((mergedTreeNode: TreeNode) => {
                // this.$store.commit("pushToMolecules", mergedTreeNode);
                mergedTreeNode.visible = true;
                mergedTreeNode.addToMainTree(this.pluginId);
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
        //             this.getUserArg("newName")
        //         );
        //     })
        //     .then((mergedTreeNode: TreeNode) => {
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
    async getTests(): Promise<ITest[]> {
        return [
            {
                beforePluginOpens: new TestCmdList()
                    .loadExampleMolecule(true)
                    .selectMoleculeInTree("Protein")
                    .selectMoleculeInTree("Compounds", true),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    ".merged"
                ),
            },
        ];
    }
}
</script>

<style scoped lang="scss"></style>
