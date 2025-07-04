<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onPopupDone="onPopupDone" actionBtnTxt="Find"
        @onUserArgChanged="onUserArgChanged" :hideIfDisabled="true" @onMolCountsChanged="onMolCountsChanged"
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
    IUserArgMoleculeInputParams,
    IUserArgNumber,
    IUserArgRange,
    IUserArgCheckbox,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { checkProteinLoaded } from "@/Plugins/CheckUseAllowedUtils";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { FileInfo } from "@/FileSystem/FileInfo";
import { messagesApi } from "@/Api/Messages";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { compileMolModels } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { FindSimilarProteinsQueue } from "./FindSimilarProteinsQueue";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { loadPdbIdToFileInfo } from "@/Plugins/Core/RemoteMolLoaders/RemoteMolLoadersUtils";
import { PopupVariant } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import { alignFileInfos } from "../Align/AlignProteinsUtils";
import { dynamicImports } from "@/Core/DynamicImports";
/**
 * A plugin to find proteins with similar sequences using the RCSB PDB API.
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class FindSimilarProteinsPlugin extends PluginParentClass {
    menuPath = "Proteins/[8] Search/Find Similar...";
    title = "Find Similar Proteins";
    pluginId = "findsimilarproteins";
    intro = "Find proteins with similar sequences using the RCSB PDB sequence search.";
    tags = [Tag.Modeling];
    isActionBtnEnabled = false;
    softwareCredits: ISoftwareCredit[] = [
        {
            name: "RCSB Protein Data Bank",
            url: "https://www.rcsb.org/",
            license: Licenses.UNRESTRICTED, // Data policies are complex, unrestricted is safest.
            citations: [
                {
                    title: "RCSB Protein Data Bank: Architectural Advances Towards Integrated Searching and Efficient Access to Macromolecular Structure Data from the PDB Archive",
                    authors: ["Rose, Y", "Duarte, J M", "Lowe, R", "Segura, J", "Bi, C", "Bhikadiya, C", "Chen, L", "Rose, A S", "Bittrich, S", "Burley, S K", "Westbrook, J D"],
                    journal: "J Mol Biol.",
                    year: 2020,
                    volume: 433,
                    issue: "11",
                    pages: "166704",
                },
            ],
        },
        dynamicImports.usalign.credit,
    ];
    contributorCredits: IContributorCredit[] = [];

    userArgDefaults: UserArg[] = [
        {
            type: UserArgType.MoleculeInputParams,
            id: "protein_to_query",
            val: new MoleculeInput({
                considerProteins: true,
                considerCompounds: false,
                proteinFormat: "pdb",
                includeMetalsSolventAsProtein: true,
                allowUserToToggleIncludeMetalsSolventAsProtein: false
            }),
            label: "Proteins to use as queries",
        } as IUserArgMoleculeInputParams,
        {
            id: "evalue_cutoff",
            type: UserArgType.Number,
            label: "E-value cutoff",
            val: 0.1,
            description: "Maximum E-value for a match to be considered significant.",
        } as IUserArgNumber,
        {
            id: "identity_cutoff",
            type: UserArgType.Range,
            label: "Sequence identity cutoff (%)",
            val: 0,
            min: 0,
            max: 100,
            step: 1,
            description: "Minimum sequence identity required for a match.",
        } as IUserArgRange,
        {
            id: "max_results",
            type: UserArgType.Number,
            label: "Maximum results per query",
            val: 10,
            min: 1,
            max: 1000,
            description: "The maximum number of similar proteins to retrieve for each query protein.",
        } as IUserArgNumber,
        {
            id: "downloadStructures",
            type: UserArgType.Checkbox,
            label: "Download structures",
            description: "Download all protein structures into the workspace.",
            val: true,
        } as IUserArgCheckbox,
        {
            id: "alignStructures",
            type: UserArgType.Checkbox,
            label: "Align structures",
            description: "Align structures to their respective query proteins.",
            val: true,
        } as IUserArgCheckbox,
    ];

    /**
     * Checks if at least one protein is loaded.
     *
     * @returns {string | null} An error message if no protein is loaded, otherwise null.
     */
    checkPluginAllowed(): string | null {
        return checkProteinLoaded();
    }

    /**
     * Handles changes to user arguments to update button state.
     */
    onUserArgChange() {
        const downloadStructures = this.getUserArg("downloadStructures") as boolean;
        this.setUserArgEnabled("alignStructures", downloadStructures);
        const moleculeInput: MoleculeInput = this.getUserArg("protein_to_query");
        if (!moleculeInput || !moleculeInput.molsToConsider) {
            this.isActionBtnEnabled = false;
            return;
        }
        // Use compileMolModels to get a synchronous representation of what will be processed.
        const compiledMols = compileMolModels(moleculeInput.molsToConsider, true);
        // mobileMolecules only considers proteins, so compoundsNodes can be ignored.
        // nodeGroups contains a TreeNodeList for each top-level molecule that has matching proteins.
        this.isActionBtnEnabled = compiledMols.nodeGroups.length > 0;
    }

    /**
     * Executes when the user clicks the "Find" button.
     *
     * @returns {Promise<void>}
     */
    async onPopupDone(): Promise<void> {
        this.closePopup();
        const proteinFileInfos: FileInfo[] = this.getUserArg("protein_to_query");
        if (proteinFileInfos.length === 0) {
            messagesApi.popupError("No proteins selected to query.");
            return;
        }
        const evalue = this.getUserArg("evalue_cutoff");
        const identity = (this.getUserArg("identity_cutoff") as number) / 100.0;
        const maxResults = this.getUserArg("max_results");
        const payloads = proteinFileInfos.map((fi) => {
            if (!fi.treeNode) return null; // Should not happen
            const queryPdbId = fi.treeNode.getAncestry().get(0).title;
            return {
                proteinFileInfo: fi,
                evalue,
                identity,
                maxResults,
                queryPdbId,
            };
        }).filter((p): p is NonNullable<typeof p> => p !== null);
        const maxProcs = await getSetting("maxProcs");
        const queue = new FindSimilarProteinsQueue(
            this.pluginId,
            payloads,
            maxProcs,
            undefined,
            1, // procsPerJobBatch
            5  // simulBatches (to respect PDB rate limit)
        );
        const allJobOutputs: any[] = await queue.done;
        this.processAndDisplayResults(allJobOutputs);
    }
    /**
     * Processes the combined results from all jobs and displays them in a table.
     *
     * @param {any[]} allJobOutputs - The completed job outputs.
     */
    private async processAndDisplayResults(allJobOutputs: any[]): Promise<void> {
        const combinedResults = new Map<string, { score: number; queries: Set<TreeNode> }>();
        allJobOutputs.forEach((jobOutput: any) => {
            if (jobOutput.error) {
                const queryTitle = jobOutput.query ? jobOutput.query.title : 'Unknown Query';
                console.error(`Error for ${queryTitle}: ${jobOutput.error}`);
                return;
            }
            jobOutput.results?.forEach((item: any) => {
                const existing = combinedResults.get(item.identifier);
                if (existing) {
                    existing.queries.add(jobOutput.query);
                    if (item.score > existing.score) {
                        existing.score = item.score; // Keep the best score for a given PDB ID
                    }
                } else {
                    combinedResults.set(item.identifier, {
                        score: item.score,
                        queries: new Set([jobOutput.query]),
                    });
                }
            });
        });
        if (combinedResults.size === 0) {
            messagesApi.popupMessage("No Similar Proteins", "No similar proteins were found for the selected queries.");
            return;
        }
        const sortedResults = [...combinedResults.entries()].sort(
            (a, b) => b[1].score - a[1].score
        );
        const tableData = {
            headers: [
                { text: "PDB ID", width: 80 },
                { text: "Score", note: "PDB Search Score" },
                { text: "Query Protein" },
            ],
            rows: sortedResults.map(([pdbId, data]) => ({
                "PDB ID": `<a href="https://www.rcsb.org/structure/${pdbId}" target="_blank" rel="noopener noreferrer">${pdbId}</a>`,
                "Score": data.score.toFixed(4),
                "Query Protein": Array.from(data.queries).map(q => q.descriptions.pathName(" > ", 30)).join(", "),
            })),
        };
        messagesApi.popupTableData(
            "Similar Proteins Found",
            `Found ${sortedResults.length} unique similar proteins.`,
            tableData,
            "Search Results"
        );
        const downloadStructures = this.getUserArg("downloadStructures") as boolean;
        const alignStructures = this.getUserArg("alignStructures") as boolean;
        if (downloadStructures) {
            const pdbIdsToLoad = sortedResults.map(([pdbId]) => pdbId);
            const spinnerId = messagesApi.startWaitSpinner();
            const chunkSize = 5; // To respect RCSB rate limits
            try {
                for (let i = 0; i < pdbIdsToLoad.length; i += chunkSize) {
                    const chunk = pdbIdsToLoad.slice(i, i + chunkSize);
                    const loadPromises = chunk.map(async (pdbId: string) => {
                        try {
                            let fileInfo = await loadPdbIdToFileInfo(pdbId);
                            if (alignStructures) {
                                // Find one of the original query proteins for this PDB ID
                                const queryData = sortedResults.find(([id]) => id === pdbId)?.[1];
                                if (queryData && queryData.queries.size > 0) {
                                    const queryNode = queryData.queries.values().next().value as TreeNode; // Pick first query node
                                    const refFileInfo = await queryNode.toFileInfo("pdb", true);
                                    const alignedFileInfos = await alignFileInfos(refFileInfo, [fileInfo]);
                                    if (alignedFileInfos.length > 0) {
                                        fileInfo = alignedFileInfos[0];
                                        // Update the name to indicate it's aligned.
                                        fileInfo.name = `${pdbId}-aligned-to-${queryNode.getAncestry().get(0).title}.pdb`;
                                    } else {
                                        console.warn(`Alignment failed for ${pdbId}, loading unaligned structure.`);
                                    }
                                } else {
                                    console.warn(`Could not find query protein node for ${pdbId}, loading unaligned structure.`);
                                }
                            }
                            await this.addFileInfoToViewer({
                                fileInfo,
                                tag: this.pluginId,
                            });
                        } catch (error) {
                            console.error(`Failed to load PDB ID ${pdbId}:`, error);
                            messagesApi.popupMessage(
                                "Load Error",
                                `Could not load PDB ID ${pdbId}.`,
                                PopupVariant.Warning,
                                undefined,
                                false,
                                {}
                            );
                        }
                    });
                    await Promise.all(loadPromises);
                }
            } catch (error) {
                messagesApi.popupError(
                    "An unexpected error occurred while downloading structures."
                );
            } finally {
                messagesApi.stopWaitSpinner(spinnerId);
            }
        }
    }
    /**
     * This plugin does not run jobs in the browser directly; it uses a queue.
     *
     * @returns {Promise<void>}
     */
    async runJobInBrowser(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Defines the test case for this plugin.
     *
     * @returns {Promise<ITest[]>} The test configuration.
     */
    async getTests(): Promise<ITest[]> {
        const pdb1xdn = "https://files.rcsb.org/view/1XDN.pdb";
        const pdb4wp4 = "https://files.rcsb.org/view/4WP4.pdb";
        return [
            // Test 1: Basic Search and Download (with Alignment)
            {
                beforePluginOpens: new TestCmdList().loadExampleMolecule(true, pdb1xdn, 0),
                afterPluginCloses: new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "1S68")
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "1S68-aligned-to-1XDN"),
            },
            // Test 2: Search and Download (without Alignment)
            {
                beforePluginOpens: new TestCmdList().loadExampleMolecule(true, pdb1xdn, 1),
                pluginOpen: new TestCmdList().click("#alignStructures-findsimilarproteins-item"), // Uncheck align
                afterPluginCloses: new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "1S68")
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "1S68"),
            },
            // Test 3: Search without Downloading
            {
                beforePluginOpens: new TestCmdList().loadExampleMolecule(true, pdb1xdn, 2),
                pluginOpen: new TestCmdList().click("#downloadStructures-findsimilarproteins-item"), // Uncheck download
                afterPluginCloses: new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "1S68")
                    .click("#modal-tabledatapopup .cancel-btn")
                    .wait(2) // Wait a bit to ensure nothing is being added
                    .waitUntilNotRegex("#navigator", "1S68"),
            },
            // Test 4: Multiple Query Proteins
            {
                beforePluginOpens: new TestCmdList()
                    .loadExampleMolecule(true, pdb4wp4, 3)
                    .loadExampleMolecule(true, pdb1xdn, 3),
                afterPluginCloses: new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "Query Protein")
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "aligned-to-4WP4")
                    .waitUntilRegex("#navigator", "aligned-to-1XDN"),
            },
            // Test 5: No Results Found
            // {
            //     beforePluginOpens: new TestCmdList().loadExampleMolecule(true, pdb1xdn, 4),
            //     pluginOpen: new TestCmdList().setUserArg("identity_cutoff", 100, "findsimilarproteins"), // 100% identity
            //     afterPluginCloses: new TestCmdList()
            //         .waitUntilRegex("#modal-simplemsg", "No similar proteins were found"),
            // },
            // Test 6: Capping Maximum Results
            {
                beforePluginOpens: new TestCmdList().loadExampleMolecule(true, pdb1xdn, 4),
                pluginOpen: new TestCmdList().setUserArg("max_results", 3, "findsimilarproteins"),
                afterPluginCloses: new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "Similar Proteins Found")
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "aligned-to-1XDN"),
            },
        ];
    }
}
</script>