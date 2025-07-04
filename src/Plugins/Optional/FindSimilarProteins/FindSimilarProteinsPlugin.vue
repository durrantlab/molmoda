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
    IUserArgSelect,
    IUserArgTextArea,
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
import { dynamicImports } from "@/Core/DynamicImports";
import { convertFastaToSeqences } from "@/Core/Bioinformatics/AminoAcidUtils";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { FindSimilarProteinsQueue } from "./FindSimilarProteinsQueue";
import { loadPdbIdToFileInfo } from "@/Plugins/Core/RemoteMolLoaders/RemoteMolLoadersUtils";
import { alignFileInfos } from "../Align/AlignProteinsUtils";
import { PopupVariant } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
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
    pluginId = "findsimilarproteins";
    intro = "Find proteins with similar sequences using the RCSB PDB sequence search.";
    tags = [Tag.Modeling];
    isActionBtnEnabled = false;
    userArgDefaults: UserArg[] = [
        {
            id: "inputType",
            type: UserArgType.Select,
            label: "Query source",
            val: "workspace",
            description:
                "Choose whether to use proteins from the workspace or to provide FASTA text.",
            options: [
                { description: "Use proteins from workspace", val: "workspace" },
                { description: "Use FASTA text", val: "fasta" },
            ],
        } as IUserArgSelect,
        {
            type: UserArgType.MoleculeInputParams,
            id: "protein_to_query",
            val: new MoleculeInput({
                considerProteins: true,
                considerCompounds: false,
                proteinFormat: "pdb",
                includeMetalsSolventAsProtein: true,
                allowUserToToggleIncludeMetalsSolventAsProtein: false,
            }),
            label: "Proteins to use as queries",
        } as IUserArgMoleculeInputParams,
        {
            id: "fastaText",
            type: UserArgType.TextArea,
            label: "FASTA sequence(s) to use as queries",
            val: "",
            enabled: false,
            placeHolder:
                ">sp|P01308|INS_HUMAN Insulin\nMALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALY\nLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPL\nALEGSLQKRGIVEQCCTSICSLYQLENYCN...",
            description:
                "Paste one or more protein sequences in FASTA format. Each sequence should start with a '>' header line.",
        } as IUserArgTextArea,
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
            description:
                "Align structures to their respective query proteins. Only available when using proteins from the workspace.",
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
        const inputType = this.getUserArg("inputType");
        const isWorkspace = inputType === "workspace";
        const downloadStructures = this.getUserArg("downloadStructures") as boolean;
        this.setUserArgEnabled("protein_to_query", isWorkspace);
        this.setUserArgEnabled("fastaText", !isWorkspace);
        this.setUserArgEnabled(
            "alignStructures",
            downloadStructures && isWorkspace
        );
        if (isWorkspace) {
            const moleculeInput: MoleculeInput = this.getUserArg("protein_to_query");
            if (!moleculeInput || !moleculeInput.molsToConsider) {
                this.isActionBtnEnabled = false;
                return;
            }
            const compiledMols = compileMolModels(
                moleculeInput.molsToConsider,
                true
            );
            this.isActionBtnEnabled = compiledMols.nodeGroups.length > 0;
        } else {
            const fastaText = (this.getUserArg("fastaText") as string).trim();
            this.isActionBtnEnabled = fastaText.length > 0;
        }
    }

    /**
     * Executes when the user clicks the "Find" button.
     *
     * @returns {Promise<void>}
     */
    async onPopupDone(): Promise<void> {
        this.closePopup();
        const evalue = this.getUserArg("evalue_cutoff");
        const identity = (this.getUserArg("identity_cutoff") as number) / 100.0;
        const maxResults = this.getUserArg("max_results");
        const inputType = this.getUserArg("inputType");
        const payloads: any[] = [];
        if (inputType === "workspace") {
            const proteinFileInfos: FileInfo[] = this.getUserArg("protein_to_query");
            if (proteinFileInfos.length === 0) {
                messagesApi.popupError("No proteins selected to query.");
                return;
            }
            proteinFileInfos.forEach((fi) => {
                if (!fi.treeNode) return;
                const queryIdentifier = fi.treeNode.getAncestry().get(0).title;
                payloads.push({
                    proteinFileInfo: fi,
                    evalue,
                    identity,
                    maxResults,
                    queryIdentifier,
                    query: fi.treeNode,
                });
            });
        } else {
            // FASTA input
            const fastaText = this.getUserArg("fastaText") as string;
            const sequences = convertFastaToSeqences(fastaText);
            if (sequences.length === 0) {
                messagesApi.popupError(
                    "No valid sequences found in the provided FASTA text."
                );
                return;
            }
            sequences.forEach(([name, seq]) => {
                payloads.push({
                    sequence: seq,
                    evalue,
                    identity,
                    maxResults,
                    queryIdentifier: name,
                    query: name, // The query is the FASTA header string
                });
            });
        }
        if (payloads.length === 0) {
            messagesApi.popupError("No valid queries to process.");
            return;
        }
        const maxProcs = await getSetting("maxProcs");
        const queue = new FindSimilarProteinsQueue(
            this.pluginId,
            payloads,
            maxProcs,
            undefined,
            1, // procsPerJobBatch
            5 // simulBatches (to respect PDB rate limit)
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
        const combinedResults = new Map<
            string,
            { score: number; queries: Set<TreeNode | string> }
        >();
        allJobOutputs.forEach((jobOutput: any) => {
            if (jobOutput.error) {
                const query = jobOutput.query;
                const queryTitle =
                    query instanceof TreeNode ? query.title : query || "Unknown Query";
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
            messagesApi.popupMessage(
                "No Similar Proteins",
                "No similar proteins were found for the selected queries."
            );
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
                Score: data.score.toFixed(4),
                "Query Protein": Array.from(data.queries)
                    .map((q) =>
                        q instanceof TreeNode ? q.descriptions.pathName(" > ", 30) : q
                    )
                    .join(", "),
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
                                    const query = queryData.queries.values().next()
                                        .value as TreeNode; // Pick first query node
                                    if (query instanceof TreeNode) {
                                        const queryNode = query as TreeNode;
                                        const refFileInfo = await queryNode.toFileInfo("pdb", true);
                                        const alignedFileInfos = await alignFileInfos(refFileInfo, [
                                            fileInfo,
                                        ]);
                                        if (alignedFileInfos.length > 0) {
                                            fileInfo = alignedFileInfos[0];
                                            // Update the name to indicate it's aligned.
                                            fileInfo.name = `${pdbId}-aligned-to-${queryNode
                                                .getAncestry()
                                                .get(0).title}.pdb`;
                                        } else {
                                            console.warn(
                                                `Alignment failed for ${pdbId}, loading unaligned structure.`
                                            );
                                        }
                                    }
                                } else {
                                    console.warn(
                                        `Could not find query protein node for ${pdbId}, loading unaligned structure.`
                                    );
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
        const fastaText = `>my_protein
MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG`;
        return [
            // Test 1: Workspace Search and Download (with Alignment)
            {
                beforePluginOpens: new TestCmdList().loadExampleMolecule(true, pdb1xdn),
                afterPluginCloses: new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "1S68")
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "1S68-aligned-to-1XDN"),
            },
            // Test 2: FASTA text search
            {
                pluginOpen: new TestCmdList()
                    .setUserArg("inputType", "fasta", "findsimilarproteins")
                    .setUserArg("fastaText", fastaText, "findsimilarproteins")
                    .setUserArg("max_results", 3, "findsimilarproteins")
                    .click("#alignStructures-findsimilarproteins-item"), // Should be disabled, but click to test
                afterPluginCloses: new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "6T8L") // A known similar protein
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "6T8L"), // Should not be aligned
            },
            // Test 3: Multiple FASTA sequences
            {
                pluginOpen: new TestCmdList()
                    .setUserArg("inputType", "fasta", "findsimilarproteins")
                    .setUserArg("fastaText", `${fastaText}\n>protein2\nPEPTIDE`, "findsimilarproteins")
                    .setUserArg("max_results", 2, "findsimilarproteins"),
                afterPluginCloses: new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "Query Protein")
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "6T8L"),
            },
            // Test 4: FASTA text with just sequence, no header
            {
                pluginOpen: new TestCmdList()
                    .setUserArg("inputType", "fasta", "findsimilarproteins")
                    .setUserArg("fastaText", "PEPTIDE", "findsimilarproteins")
                    .setUserArg("evalue_cutoff", 10, "findsimilarproteins")
                    .setUserArg("max_results", 1, "findsimilarproteins"),
                afterPluginCloses: new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "1PEO")
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "1PEO"),
            },
        ];
    }
}
</script>