<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" actionBtnTxt="Clone" @onPopupDone="onPopupDone"
        :hideIfDisabled="true" @onUserArgChanged="onUserArgChanged" @onMolCountsChanged="onMolCountsChanged">
    </PluginComponent>
</template>

<script lang="ts">
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";

import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import FormInput from "@/UI/Forms/FormInput.vue";
import { cloneMolsWithAncestry, mergeTreeNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { getDefaultNodeToActOn, setNodesToActOn } from "./EditBarUtils";
import { UserArg, IUserArgText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { checkAnyMolSelected } from "../../CheckUseAllowedUtils";
import { ITest } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { Component } from "vue-facing-decorator";

/** CloneMolPlugin */
@Component({
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
    intro = `Clone (copy) the selected molecule(s).`;
    details = "This plugin creates an identical, independent copy of the selected molecule(s) within the current project. When multiple molecules are selected, they are cloned together under a single new top-level molecule, preserving their organization (Protein, Compounds, Metals, etc.).";
    tags = [Tag.All];

    userArgDefaults: UserArg[] = [
        {
            id: "newName",
            label: "",
            val: "",
            placeHolder: "Name of new cloned molecule...",
            description: "The name of the new, cloned molecule.",
            validateFunc: (newName: string): boolean => {
                // When multiple molecules are selected, the name field is
                // auto-populated with a placeholder and is not actually used,
                // so it should still pass validation. The single-selection
                // case requires a non-empty name.
                return newName.length > 0;
            },
        } as IUserArgText,
    ];

    nodesToActOn = new TreeNodeList([getDefaultNodeToActOn()]);

    logJob = false;

    /**
     * Runs before the popup opens. Initializes nodesToActOn from the current
     * selection (or payload), and pre-populates the name field with a sensible
     * default derived from the source molecule(s).
     *
     * @param {any} payload  The payload (node id), if any.
     */
    async onBeforePopupOpen(payload: any) {
        // Use terminalAnySelected=true so multi-selections are gathered as a
        // flat list of terminal nodes, mirroring MergeMolsPlugin's behavior.
        setNodesToActOn(this, payload, true);
        // Build the suggested title from the unique top ancestor titles of
        // the selected nodes. With one selection (or multiple selections all
        // sharing the same top ancestor) this yields "<title>:cloned"; with
        // selections spanning multiple top-level molecules it yields a
        // dash-joined list, e.g. "4WP4-1XYZ:cloned".
        const titles: string[] = [];
        this.nodesToActOn.forEach((node) => {
            const title = node
                .getAncestry(this.$store.state.molecules as TreeNodeList)
            .get(0).title;
            if (titles.indexOf(title) === -1) {
                titles.push(title);
            }
        });
        titles.sort();
        this.setUserArg("newName", titles.join("-") + ":cloned");
    }
    /**
     * Check if this plugin can currently be used. Allows cloning whenever at
     * least one molecule is selected (single or multiple).
     *
     * @returns {string | null}  Error message string, or null to proceed.
     */
    checkPluginAllowed(): string | null {
        return checkAnyMolSelected();
    }

    /**
     * Clones the selected molecule(s) into the project. Single-selection
     * preserves the original behavior: a straight clone of the selected
     * subtree. Multi-selection produces one new top-level molecule whose
     * descendants are the cloned selections, organized by type (Protein,
     * Compounds, Metals, etc.) via mergeTreeNodes, which collapses nodes of
     * the same type across the cloned ancestries.
     *
     * @returns {Promise<void>}  Resolves when the clone has been added.
     */
    runJobInBrowser(): Promise<void> {
        if (!this.nodesToActOn || this.nodesToActOn.length === 0) {
            return Promise.resolve();
        }
        const newName = this.getUserArg("newName");
        const isSingleSelection = this.nodesToActOn.length === 1;
                    if (isSingleSelection) {
            // Original single-selection path: clone the node with its
            // ancestry intact and rename the top-level result.
            return cloneMolsWithAncestry(this.nodesToActOn, true)
                .then((treeNodeList: TreeNodeList) => {
                    const node = treeNodeList.get(0);
                    node.title = newName;
                treeNodeList.addToMainTree(this.pluginId);
                    return;
                })
                .catch((err) => {
                    throw err;
                });
        }
        // Multi-selection path: clone each selected terminal with its full
        // ancestry, then merge the resulting cloned trees into a single new
        // top-level molecule. mergeTreeNodes consolidates same-type
        // sub-nodes (e.g., all Protein children collapse under one Protein
        // node), giving the user one organized clone rather than several
        // independent top-level entries.
        return cloneMolsWithAncestry(this.nodesToActOn, true)
            .then((clonedTopLevelNodes: TreeNodeList) => {
                return mergeTreeNodes(clonedTopLevelNodes, newName);
            })
            .then((mergedTreeNode: TreeNode) => {
                mergedTreeNode.addToMainTree(this.pluginId);
                return;
            })
            .catch((err) => {
                throw err;
        });
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
            // Test 1: Single-selection clone (original behavior).
            {
                beforePluginOpens: () => new TestCmdList()
                    .loadExampleMolecule(true)
                    .selectMoleculeInTree("Protein"),
                pluginOpen: () => new TestCmdList().setUserArg("newName", "Cloned Protein", this.pluginId),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex("#navigator", "Cloned Protein")
                    .wait(0.5)
                    .tourNote(
                        "The protein was cloned by accessing the plugin via the menu. You can also clone a molecule by clicking the clone icon directly in the navigator. Let's try that next.",
                        "#navigator"
                    )
                    // Also check clicking in title bar
                    .selectMoleculeInTree("Compounds")
                    .wait(0.5)
                    .click(
                        '#navigator div[data-label="Compounds"] span.cloneextract',
                        false,
                        "clone it"
                    )
                    .text("#newName-clonemol-item", "Compounds-cloned")
                    .pressPopupButton(".action-btn", this.pluginId)
                    .wait(2)
                    .waitUntilRegex("#navigator", "Compounds-cloned"),
            },
            // Test 2: Attempt to clone with no selection. checkAnyMolSelected
            // now governs this, so the error message reflects "no molecules
            // selected" rather than "select one (and only one)".
            {
                beforePluginOpens: () => new TestCmdList().loadExampleMolecule(),
                // No selection is made, checkPluginAllowed should fail.
                closePlugin: () => new TestCmdList(),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex(
                        "#modal-simplemsg",
                        "No molecules are currently selected"
                    )
                    // Also need to close the simple message popup to continue.
                    .click("#modal-simplemsg .cancel-btn"),
            },
            // Test 3: Multi-selection clone within a single top-level
            // molecule. The Protein and Compounds children of 4WP4 are
            // selected together; the resulting clone should be a single new
            // top-level molecule containing both, organized by type. The
            // "(2)" suffix in the navigator confirms two child sub-nodes
            // (Protein and Compounds) were merged under the new clone.
            {
                beforePluginOpens: () => new TestCmdList()
                    .loadExampleMolecule(true)
                    .selectMoleculeInTree("Protein")
                    .selectMoleculeInTree("Compounds", true), // shift-click adds to selection
                pluginOpen: () => new TestCmdList().setUserArg(
                    "newName",
                    "Multi-Cloned",
                    this.pluginId
                ),
                afterPluginCloses: () => new TestCmdList()
                    .wait(2)
                    .waitUntilRegex("#navigator", "Multi-Cloned")
                    .waitUntilRegex("#navigator", "Multi-Cloned.*\\(2\\)"),
            },
            // Test 4: Multi-selection clone spanning two different top-level
            // molecules. Loads 4WP4 (provides Protein/Compounds children) and
            // a separate SMILES molecule (provides its own Compounds child),
            // selects across both, and verifies the resulting clone uses the
            // dash-joined naming convention. Using a SMILES molecule for the
            // second top-level avoids depending on a second PDB being
            // available on the test server.
            {
                beforePluginOpens: () => new TestCmdList()
                    .loadExampleMolecule(true)
                    // Add a second top-level molecule via SMILES. The name
                    // "ligX" becomes the top-ancestor title for sort/join.
                    .loadSMILESMolecule("CCO", true, "ligX")
                    // Select 4WP4's Protein child, then shift-click ligX to
                    // pick up a child from the second top-level molecule.
                    .selectMoleculeInTree("Protein")
                    .selectMoleculeInTree("ligX", true),
                afterPluginCloses: () => new TestCmdList()
                    .wait(2)
                    // The default name joins unique top-ancestor titles with
                    // a dash (alphabetical sort) and appends ":cloned".
                    // "4WP4" sorts before "ligX" lexicographically because
                    // digits precede lowercase letters in ASCII.
                    .waitUntilRegex("#navigator", "4WP4-ligX:cloned"),
            },
        ];
    }
}
</script>

<style scoped lang="scss"></style>
