<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onPopupDone="onPopupDone" actionBtnTxt="Align"
        @onUserArgChanged="onUserArgChanged" @onMolCountsChanged="onMolCountsChanged"
        :isActionBtnEnabled="isActionBtnEnabled">
    </PluginComponent>
</template>
<script lang="ts">
import { Options } from "vue-class-component";
import {
    IContributorCredit,
    ISoftwareCredit,
    Licenses,
} from "@/Plugins/PluginInterfaces";
import {
    UserArg,
    UserArgType,
    IUserArgSelectMolecule,
    IUserArgMoleculeInputParams,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { dynamicImports } from "@/Core/DynamicImports";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { checkProteinLoaded } from "@/Plugins/CheckUseAllowedUtils";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { FileInfo } from "@/FileSystem/FileInfo";
import { messagesApi } from "@/Api/Messages";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { compileMolModels } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
import { SelectedType, TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { FailingTest } from "@/Testing/FailingTest";
import { MoleculeTypeFilter } from "@/UI/Forms/FormSelectMolecule/FormSelectMoleculeInterfaces";
/**
 * A plugin to align multiple protein structures to a reference protein.
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class AlignProteinsPlugin extends PluginParentClass {
    menuPath = "Proteins/[8] Align...";
    title = "Align Proteins";
    softwareCredits: ISoftwareCredit[] = [dynamicImports.usalign.credit]

    contributorCredits: IContributorCredit[] = [];
    pluginId = "alignproteins";
    intro =
        "Align multiple protein structures to a reference (template) structure.";
    details =
        "This tool uses US-align to perform structural alignment. Aligned structures will be added to the workspace.";
    tags = [Tag.Modeling];
    isActionBtnEnabled = false;
    userArgDefaults: UserArg[] = [
        {
            id: "referenceMolecule",
            type: UserArgType.SelectMolecule,
            label: "Reference (template) protein",
            description:
                "The protein structure to which all other proteins will be aligned.",
            val: "",
            filterType: MoleculeTypeFilter.Protein,
        } as IUserArgSelectMolecule,
        {
            id: "mobileMolecules",
            type: UserArgType.MoleculeInputParams,
            val: new MoleculeInput({
                considerProteins: true,
                considerCompounds: false,
                proteinFormat: "pdb",
            }),
            label: "Proteins to align",
        } as IUserArgMoleculeInputParams,
    ];
    /**
     * Checks if the plugin is allowed to be used.
     *
     * @returns {string | null} An error message if not allowed, otherwise null.
     */
    checkPluginAllowed(): string | null {
        const proteinCheck = checkProteinLoaded();
        if (proteinCheck) {
            return proteinCheck;
        }
        if (getMoleculesFromStore().filters.keepType(TreeNodeType.Protein, true).length < 2) {
            return "At least two proteins are required for alignment.";
        }
        return null;
    }
    /**
     * Handles changes to user arguments to update button state.
     */
    onUserArgChanged() {
        const refId = this.getUserArg("referenceMolecule");
        const moleculeInput: MoleculeInput = this.getUserArg("mobileMolecules");
        if (!moleculeInput || !moleculeInput.molsToConsider) {
            this.isActionBtnEnabled = false;
            return;
        }
        // Use compileMolModels to get a synchronous representation of what will be processed.
        const compiledMols = compileMolModels(moleculeInput.molsToConsider, true);
        // mobileMolecules only considers proteins, so compoundsNodes can be ignored.
        // nodeGroups contains a TreeNodeList for each top-level molecule that has matching proteins.
        // We need to get the ID of the top-level molecule for each group.
        const mobileTopLevelNodeIds = compiledMols.nodeGroups
            .map((tnl) => {
                if (tnl.length > 0) {
                    // All nodes in tnl are terminals from the same top-level molecule
                    return tnl.get(0).getAncestry().get(0).id;
                }
                return null;
            })
            .filter((id): id is string => id !== null);
        // Filter out the reference molecule from the mobile list
        const finalMobileCount = mobileTopLevelNodeIds.filter(
            (id) => id !== refId
        ).length;
        this.isActionBtnEnabled = refId !== "" && finalMobileCount > 0;
    }

    /**
     * Executes when the user clicks the "Align" button.
     */
    onPopupDone(): void {
        this.closePopup();
        this.submitJobs([this.userArgs]);
    }
    /**
     * The main alignment logic.
     *
     * @param {UserArg[]} userArgs The user arguments from the form.
     * @returns {Promise<void>}
     */
    async runJobInBrowser(userArgs: UserArg[]): Promise<void> {
        const spinnerId = messagesApi.startWaitSpinner();
        const getArgValue = (id: string) => {
            const arg = userArgs.find((a) => a.id === id);
            return arg ? arg.val : undefined;
        };
        try {
            const refId = getArgValue("referenceMolecule") as string;
            const mobileInfos = getArgValue("mobileMolecules") as FileInfo[];
            if (!refId || !mobileInfos) {
                throw new Error("Missing reference or mobile molecules.");
            }
            const allMolecules = getMoleculesFromStore();
            const referenceNode = allMolecules.filters.onlyId(refId);
            if (!referenceNode) {
                throw new Error("Reference protein not found.");
            }

            const refFileInfo = await referenceNode.toFileInfo("pdb", true); // Consider descendants
            if (!refFileInfo || !refFileInfo.contents) {
                throw new Error(
                    `Could not convert reference protein ${referenceNode.title} to PDB format.`
                );
            }
            const referencePdb = refFileInfo.contents;
            // Exclude the reference protein from the list of mobile proteins
            const mobileNodes = mobileInfos
                .map((info) => info.treeNode)
                .filter(
                    (node): node is TreeNode =>
                        !!node && node.getAncestry().get(0).id !== refId
                );
            if (mobileNodes.length === 0) {
                messagesApi.popupError(
                    "No proteins to align. Ensure you have selected proteins to align that are different from the reference."
                );
                messagesApi.stopWaitSpinner(spinnerId);
                return;
            }
            const mobilePdbPromises = mobileNodes.map(async (node) => {
                // A mobile protein might be a container, so we must consider its descendants.
                const fi = await node.toFileInfo("pdb", true);
                if (!fi || !fi.contents) {
                    console.warn(
                        `Could not convert mobile protein ${node.title} to PDB. It will be skipped.`
                    );
                    return null; // Return null for failed conversions
                }
                return fi.contents;
            });
            const mobilePdbsWithNulls = await Promise.all(mobilePdbPromises);
            const validMobilePdbs: string[] = [];
            const validMobileNodes: TreeNode[] = [];
            mobilePdbsWithNulls.forEach((pdb, index) => {
                if (pdb !== null) {
                    validMobilePdbs.push(pdb);
                    validMobileNodes.push(mobileNodes[index]);
                }
            });
            if (validMobilePdbs.length === 0) {
                throw new Error(
                    "Could not convert any of the mobile proteins to PDB format."
                );
            }
            const worker = new Worker(
                new URL("./AlignProteins.worker.ts", import.meta.url)
            );
            const path = window.location.pathname;
            const basePath =
                window.location.origin + path.substring(0, path.lastIndexOf("/") + 1);
            const result = await runWorker(worker, {
                referencePdb,
                mobilePdbs: validMobilePdbs,
                basePath: basePath,
            });
            if (result.error) {
                throw new Error(result.error);
            }
            const { alignedPdbs } = result;
            const newNodes: TreeNode[] = [];
            for (let i = 0; i < alignedPdbs.length; i++) {
                const alignedContent = alignedPdbs[i];
                if (alignedContent.startsWith("ERROR:")) {
                    console.error(alignedContent);
                    continue;
                }
                const originalNode = validMobileNodes[i];
                const newFileInfo = new FileInfo({
                    name: `${originalNode.title}_aligned.pdb`,
                    contents: alignedContent,
                });
                const loadedNode = await TreeNode.loadFromFileInfo({
                    fileInfo: newFileInfo,
                    tag: this.pluginId,
                });
                if (loadedNode) {
                    loadedNode.title = `${originalNode.title}:aligned`;
                    newNodes.push(loadedNode);
                }
            }
            if (newNodes.length > 0) {
                const rootNode = new TreeNode({
                    title: `Aligned to ${referenceNode.title}`,
                    treeExpanded: true,
                    visible: true,
                    selected: SelectedType.False,
                    focused: false,
                    viewerDirty: false,
                    nodes: new TreeNodeList(newNodes),
                });
                rootNode.addToMainTree(this.pluginId);
            }
        } catch (error: any) {
            messagesApi.popupError(`Alignment failed: ${error.message}`);
        } finally {
            messagesApi.stopWaitSpinner(spinnerId);
        }
    }
    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]} The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        return [FailingTest];
        // [
        //     {
        //         beforePluginOpens: new TestCmdList()
        //             .loadExampleMolecule(true, "testmols/1XDN.pdb")
        //             .waitUntilRegex("#navigator", "1XDN")
        //             .loadExampleMolecule(true, "testmols/2HU4.pdb")
        //             .waitUntilRegex("#navigator", "2HU4"),
        //         pluginOpen: new TestCmdList().wait(2), // wait for UI to settle
        //         afterPluginCloses: new TestCmdList().waitUntilRegex(
        //             "#navigator",
        //             "Aligned to 1XDN"
        //         ),
        //     },
        // ];
    }
}
</script>