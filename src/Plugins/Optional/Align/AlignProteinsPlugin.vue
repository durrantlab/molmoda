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
} from "@/Plugins/PluginInterfaces";
import {
    UserArg,
    UserArgType,
    IUserArgSelectMolecule,
    IUserArgMoleculeInputParams,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { checkMultipleTopLevelProteinsLoaded } from "@/Plugins/CheckUseAllowedUtils";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { FileInfo } from "@/FileSystem/FileInfo";
import { messagesApi } from "@/Api/Messages";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { compileMolModels } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
import { ITest } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { MoleculeTypeFilter } from "@/UI/Forms/FormSelectMolecule/FormSelectMoleculeInterfaces";
import { cloneMolsWithAncestry } from "@/UI/Navigation/TreeView/TreeUtils";
import { dynamicImports } from "@/Core/DynamicImports";
import { alignFileInfos } from "./AlignProteinsUtils";
import { parseAndLoadMoleculeFile } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";

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
        "This tool uses US-align to perform structural alignment. Aligned structures will be added to the project.";
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
                includeMetalsAsProtein: true,
                includeSolventAsProtein: true,
    includeNucleicAsProtein: true,
    allowUserToToggleIncludeMetalsAsProtein: false,
    allowUserToToggleIncludeSolventAsProtein: false,
    allowUserToToggleIncludeNucleicAsProtein: false,
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
        return checkMultipleTopLevelProteinsLoaded();
    }

    /**
     * Handles changes to user arguments to update button state.
     */
    onUserArgChange() {
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
            const mobileInfosFromInput = getArgValue(
                "mobileMolecules"
            ) as FileInfo[];

            if (!refId || !mobileInfosFromInput) {
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
            // Get unique top-level nodes from the FileInfos of the mobile molecules.
            const mobileTopLevelNodes = new Map<string, TreeNode>();
            mobileInfosFromInput.forEach((fi) => {
                if (fi.treeNode) {
                    const topLevelNode = fi.treeNode.getAncestry(allMolecules).get(0);
                    if (topLevelNode.id) {
                        mobileTopLevelNodes.set(topLevelNode.id, topLevelNode);
                    }
                }
            });
            // Convert each unique top-level node to a FileInfo with all descendants.
            const mobileFileInfosToAlignPromises = Array.from(
                mobileTopLevelNodes.values()
            )
                .filter((node) => node.id !== refId)
                .map(async (node) => {
                    const fileInfo = await node.toFileInfo("pdb", true);
                    fileInfo.treeNode = node; // Attach top-level node for context
                    return fileInfo;
                });
            const mobileFileInfosToAlign = await Promise.all(
                mobileFileInfosToAlignPromises
            );
            if (mobileFileInfosToAlign.length === 0) {
                messagesApi.popupError(
                    "No proteins to align. Ensure you have selected proteins to align that are different from the reference."
                );
                messagesApi.stopWaitSpinner(spinnerId);
                return;
            }
            const alignedFileInfos = await alignFileInfos(
                refFileInfo,
                mobileFileInfosToAlign
            );
            // 1. Clone the reference protein and add it to the project.
            const clonedRefList = await cloneMolsWithAncestry(
                new TreeNodeList([referenceNode]),
                true
            );
            const clonedRef = clonedRefList.get(0);
            if (clonedRef) {
                clonedRef.title = `${referenceNode.title}-aligned`;
                clonedRef.addToMainTree(this.pluginId);
            }
            // 2. Process and add each aligned mobile molecule.
            for (const newFileInfo of alignedFileInfos) {
                if (!newFileInfo.treeNode) {
                    console.error(
                        "Aligned file info is missing original tree node context.",
                        newFileInfo
                    );
                    continue;
                }
                const originalTopLevelNode = newFileInfo.treeNode;
    const loadedNodeContainerList = await parseAndLoadMoleculeFile({
                    fileInfo: newFileInfo,
                    tag: this.pluginId,
     addToTree: false
                });

    if (loadedNodeContainerList) {
     const loadedNodeContainer = loadedNodeContainerList.get(0);
                    loadedNodeContainer.title = `${originalTopLevelNode.title}-aligned`;
                    loadedNodeContainer.addToMainTree(this.pluginId);
                }
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
        return [
            {
                beforePluginOpens: () => new TestCmdList()
                    .loadExampleMolecule(true, "https://files.rcsb.org/view/1XDN.pdb")
                    .loadExampleMolecule(true, "https://files.rcsb.org/view/1S68.pdb"),
                pluginOpen: () => new TestCmdList()
                    .setUserArg("referenceMolecule", "1XDN", this.pluginId),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex("#navigator", "1XDN-aligned")
                    .waitUntilRegex("#navigator", "1S68-aligned"),
            },
        ];
    }
}
</script>