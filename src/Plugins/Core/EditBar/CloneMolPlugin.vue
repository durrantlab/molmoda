<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" actionBtnTxt="Clone" @onPopupDone="onPopupDone"
        :hideIfDisabled="true" @onUserArgChanged="onUserArgChanged" @onMolCountsChanged="onMolCountsChanged">
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";

import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import FormInput from "@/UI/Forms/FormInput.vue";
import { cloneMolsWithAncestry } from "@/UI/Navigation/TreeView/TreeUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { getDefaultNodeToActOn, setNodesToActOn } from "./EditBarUtils";
import { UserArg, IUserArgText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { checkOneMolSelected } from "../../CheckUseAllowedUtils";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";

/** CloneMolPlugin */
@Options({
    components: {
        FormInput,
        FormWrapper,
        PluginComponent,
    },
})
export default class CloneMolPlugin extends PluginParentClass {
    menuPath = ["Edit", "Molecules", "Clone..."];
    title = "Clone Molecule";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "clonemol";
    intro = `Clone (copy) the selected molecule.`;
    tags = [Tag.All];

    userArgDefaults: UserArg[] = [
        {
            id: "newName",
            label: "",
            val: "",
            placeHolder: "Name of new cloned molecule...",
            description: "The name of the new, cloned molecule.",
            validateFunc: (newName: string): boolean => {
                return newName.length > 0;
            },
        } as IUserArgText,
    ];

    nodesToActOn = new TreeNodeList([getDefaultNodeToActOn()]);

    logJob = false;

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     * 
     * @param {any} payload  The payload (node id)
     */
    async onBeforePopupOpen(payload: any) {
        setNodesToActOn(this, payload);

        const nodeToActOn = (this.nodesToActOn as TreeNodeList).get(0);

        // Get top of molecule title.
        let title = nodeToActOn
            .getAncestry(this.$store.state.molecules)
            .get(0).title;

        this.setUserArg("newName", title + ":cloned");
    }

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        return checkOneMolSelected();
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        if (!this.nodesToActOn) {
            // Nothing to do.
            return Promise.resolve();
        }

        // debugging below
        return cloneMolsWithAncestry(this.nodesToActOn, true)
            .then((treeNodeList: TreeNodeList) => {
                const node = treeNodeList.get(0);
                node.title = this.getUserArg("newName");
                treeNodeList.addToMainTree(this.pluginId);
                // this.$store.commit("pushToMolecules", node);
                return;
            })
            .catch((err) => {
                throw err;
            });

        // Replace below with cloneMolsWithAncestry when ready.

        // let nodeToActOn: TreeNode;
        // let clonedNode: Promise<TreeNode>;

        // // Cloning the molecule. Make a deep copy of the node.
        // nodeToActOn = modelsToAtoms(this.nodesToActOn[0]);
        // clonedNode = atomsToModels(nodeToActOn).then((newestNode) => {
        //   return newestNode;
        // });

        // clonedNode
        //   .then((node) => {
        //     // Get the nodes ancestory
        //     let nodeGenealogy: TreeNode[] = getNodeAncestory(
        //       node.id as string,
        //       this.$store.state.molecules
        //     );

        //     // Make copies of all the nodes in the ancestory, emptying the nodes
        //     // except for the last one.
        //     for (let i = 0; i < nodeGenealogy.length; i++) {
        //       nodeGenealogy[i] = {
        //         ...nodeGenealogy[i],
        //       };

        //       if (i < nodeGenealogy.length - 1) {
        //         nodeGenealogy[i].nodes = [];
        //       }
        //     }

        //     // Place each node in the ancestory under the next node.
        //     for (let i = 0; i < nodeGenealogy.length - 1; i++) {
        //       nodeGenealogy[i].nodes?.push(nodeGenealogy[i + 1]);

        //       // Also, parentId
        //       nodeGenealogy[i + 1].parentId = nodeGenealogy[i].id;
        //     }

        //     const topNode = nodeGenealogy[0];

        //     // Now you must redo all ids because they could be distinct from the
        //     // original copy.
        //     const allNodesFlattened = [topNode];
        //     if (topNode.nodes) {
        //       allNodesFlattened.push(...getAllNodesFlattened(topNode.nodes));
        //     }
        //     const oldIdToNewId = new Map<string, string>();
        //     for (const node of allNodesFlattened) {
        //       oldIdToNewId.set(node.id as string, randomID());
        //     }
        //     for (const node of allNodesFlattened) {
        //       node.id = oldIdToNewId.get(node.id as string);
        //       if (node.parentId) {
        //         node.parentId = oldIdToNewId.get(node.parentId);
        //       }
        //       node.selected = SelectedType.False;
        //       node.viewerDirty = true;
        //       node.focused = false;
        //     }

        //     // Update title of new node tree.
        //     topNode.title = this.getUserArg("newName");

        //     this.$store.commit("pushToMolecules", topNode);
        //     return;
        //   })
        //   .catch((err: any) => {
        //     throw err;
        //   });
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commandss.
     */
    async getTests(): Promise<ITest[]> {
        return [
            // First test cloning
            {
                beforePluginOpens: new TestCmdList()
                    .loadExampleMolecule(true, undefined, 0)
                    .selectMoleculeInTree("Protein"),
                afterPluginCloses: new TestCmdList()
                    .waitUntilRegex("#navigator", ":cloned")
                    .wait(0.5)

                    // Also check clicking in title bar
                    .selectMoleculeInTree("Compounds")
                    .wait(0.5)
                    .click('#navigator div[data-label="Compounds"] span.cloneextract')
                    .text("#newName-clonemol-item", "Compounds-clonned")
                    .pressPopupButton(".action-btn", this.pluginId)
                    .wait(2)
                    .waitUntilRegex("#navigator", "Compounds-clonned"),
            },
            // --- New Tests ---
            // Test 2: Attempt to clone with no selection
            {
                beforePluginOpens: new TestCmdList().loadExampleMolecule(undefined, undefined, 1),
                // No selection is made, checkPluginAllowed should fail.
                // The test framework should automatically catch the error message from checkPluginAllowed.
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#modal-simplemsg",
                    "First select one"
                ),
            },
            // Test 3: Attempt to clone with multiple selections
            {
                beforePluginOpens: new TestCmdList()
                    .loadExampleMolecule(true, undefined, 2)
                    .selectMoleculeInTree("Protein")
                    .selectMoleculeInTree("Compounds", true), // shift-click to select a second
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#modal-simplemsg",
                    "First select one"
                ),
            },
        ];
    }
}
</script>

<style scoped lang="scss"></style>
