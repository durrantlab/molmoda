<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onPopupDone="onPopupDone" actionBtnTxt="Find"
        @onUserArgChanged="onUserArgChanged" :hideIfDisabled="true" @onMolCountsChanged="onMolCountsChanged"
        :isActionBtnEnabled="isActionBtnEnabled">
    </PluginComponent>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import {
    IContributorCredit,
    ISoftwareCredit,
    Licenses,
} from "@/Plugins/PluginInterfaces";
import {
    UserArg,
    UserArgType,
    IUserArgSelect,
    IUserArgMoleculeInputParams,
    IUserArgRange,
    IUserArgNumber,
    IUserArgTextArea,
    IUserArgCheckbox,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { FileInfo } from "@/FileSystem/FileInfo";
import { messagesApi } from "@/Api/Messages";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { compileMolModels } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
import { ITest } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { dynamicImports } from "@/Core/DynamicImports";
import { convertFastaToSeqences } from "@/Core/Bioinformatics/AminoAcidUtils";
import { loadPdbIdToFileInfo } from "@/Plugins/Core/RemoteMolLoaders/RemoteMolLoadersUtils";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { FindSimilarProteinsQueue } from "./FindSimilarProteinsQueue";
import { alignFileInfos } from "../Align/AlignProteinsUtils";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";

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
    details =
        "This tool uses US-align to perform structural alignment. Aligned structures will be added to the project.";
    tags = [Tag.Modeling];
    isActionBtnEnabled = false;
    userArgDefaults: UserArg[] = [
        {
            id: "inputType",
            type: UserArgType.Select,
            label: "Query source",
            val: "project",
            description:
                "Choose whether to use proteins from the project or to provide FASTA text.",
            options: [
                { description: "Use proteins from project", val: "project" },
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
                includeMetalsAsProtein: true,
                includeSolventAsProtein: true,
                allowUserToToggleIncludeMetalsAsProtein: false,
                allowUserToToggleIncludeSolventAsProtein: false,
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
            id: "has_ligands",
            type: UserArgType.Checkbox,
            label: "Has Ligand(s)",
            description:
                "Only return proteins that contain non-polymer ligands (molecular weight ≥ 150 Da).",
            val: false,
        } as IUserArgCheckbox,
        {
            id: "downloadStructures",
            type: UserArgType.Checkbox,
            label: "Download structures",
            description: "Download all protein structures into the project.",
            val: true,
        } as IUserArgCheckbox,
        {
            id: "alignStructures",
            type: UserArgType.Checkbox,
            label: "Align structures",
            description:
                "Align structures to their respective query proteins. For FASTA queries, aligns to the top search result.",
            val: true,
        } as IUserArgCheckbox,
    ];

    /**
     * Checks if at least one protein is loaded.
     *
     * @returns {string | null} An error message if no protein is loaded, otherwise null.
     */
    checkPluginAllowed(): string | null {
        return null; // Always allow opening, logic is handled in onBeforePopupOpen
    }

    /**
     * Called before the popup opens. Sets the initial state of the form based
     * on whether proteins are present in the project.
     */
    async onBeforePopupOpen() {
        const allMolecules = getMoleculesFromStore();
        const proteinNodes = allMolecules.flattened.filters.keepType(
            TreeNodeType.Protein
        );
        const hasProteins = proteinNodes.length > 0;
        this.setUserArgEnabled("inputType", hasProteins);
        if (!hasProteins) {
            this.setUserArg("inputType", "fasta");
        } else {
            this.setUserArg("inputType", "project");
        }
        // Trigger onUserArgChange to update the visibility of other fields
        this.onUserArgChange();
    }
    /**
     * Handles changes to user arguments to update button state.
     */
    onUserArgChange() {
        const inputType = this.getUserArg("inputType");
        const isProject = inputType === "project";
        const downloadStructures = this.getUserArg("downloadStructures") as boolean;
        this.setUserArgEnabled("protein_to_query", isProject);
        this.setUserArgEnabled("fastaText", !isProject);
        this.setUserArgEnabled("alignStructures", downloadStructures);
        if (isProject) {
            const moleculeInput: MoleculeInput = this.getUserArg("protein_to_query");
            if (!moleculeInput || !moleculeInput.molsToConsider) {
                this.isActionBtnEnabled = false;
                return;
            }
            // Use compileMolModels to get a synchronous representation of what will be processed.
            const compiledMols = compileMolModels(
                moleculeInput.molsToConsider,
                true
            );
            // mobileMolecules only considers proteins, so compoundsNodes can be ignored.
            // nodeGroups contains a TreeNodeList for each top-level molecule that has matching proteins.
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
        const hasLigands = this.getUserArg("has_ligands") as boolean;
        const inputType = this.getUserArg("inputType");
        const payloads: any[] = [];
        if (inputType === "project") {
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
                    hasLigands,
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
                    hasLigands,
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
            "Search Results",
            3,
            "similar-proteins-results"
        );
        const downloadStructures = this.getUserArg("downloadStructures") as boolean;
        const alignStructures = this.getUserArg("alignStructures") as boolean;
        if (downloadStructures) {
            await this._downloadAndAlignStructures(allJobOutputs, alignStructures);
        }
    }
    /**
     * Downloads and optionally aligns the structures from the search results.
     *
     * @param {any[]} allJobOutputs - The raw output from the job queue.
     * @param {boolean} align - Whether to perform alignment.
     */
    private async _downloadAndAlignStructures(
        allJobOutputs: any[],
        align: boolean
    ): Promise<void> {
        const spinnerId = messagesApi.startWaitSpinner();
        // Group PDBs by the reference they should be aligned to.
        // Key: reference identifier (TreeNode.id or a PDB ID).
        // Value: Set of mobile PDB IDs.
        const alignmentGroups = new Map<string, Set<string>>();
        // Store the query object (TreeNode or string) for each reference.
        const referenceToQueryMap = new Map<string, (TreeNode | string)[]>();

        for (const jobOutput of allJobOutputs) {
            if (jobOutput.error || !jobOutput.results || jobOutput.results.length === 0) {
                continue;
            }
            const { query, results } = jobOutput;
            const mobilePdbIds: string[] = results.map((item: any) => item.identifier);
            let referenceId: string;
            if (query instanceof TreeNode) {
                referenceId = query.id as string;
            } else {
                // For FASTA, the reference is the top hit.
                if (mobilePdbIds.length > 0) {
                    referenceId = mobilePdbIds[0];
                } else {
                    // This case should be caught earlier, but as a safeguard:
                    console.warn(
                        "Job output has no results, cannot determine reference ID for FASTA query:",
                        query
                    );
                    continue;
                }
            }
            if (!referenceToQueryMap.has(referenceId)) {
                referenceToQueryMap.set(referenceId, []);
            }
            referenceToQueryMap.get(referenceId)!.push(query);
            if (!alignmentGroups.has(referenceId)) {
                alignmentGroups.set(referenceId, new Set<string>());
            }
            const mobileSet = alignmentGroups.get(referenceId);
            if (mobileSet) {
                mobilePdbIds.forEach((id) => mobileSet.add(id));
            }
        }

        try {
            for (const [referenceId, mobileIdSet] of alignmentGroups.entries()) {
                const queries = referenceToQueryMap.get(referenceId);
                if (!queries || queries.length === 0) {
                    console.warn(`No query found for reference ID: ${referenceId}`);
                    continue;
                }
                const query = queries[0];
                const isProjectQuery = query instanceof TreeNode;
                let referenceFileInfo: FileInfo | null = null;
                let referenceTitle = "";
                if (align) {
                    if (isProjectQuery) {
                        const referenceNode = getMoleculesFromStore().filters.onlyId(referenceId);
                        if (referenceNode) {
                            referenceFileInfo = await referenceNode.toFileInfo("pdb", true);
                            referenceTitle = referenceNode.getAncestry().get(0).title;
                        }
                    } else {
                        referenceFileInfo = await loadPdbIdToFileInfo(referenceId);
                        referenceTitle = referenceId;
                        await this.addFileInfoToViewer({
                            fileInfo: referenceFileInfo,
                            tag: this.pluginId,
                        });
                    }
                }
                const mobileIds = Array.from(mobileIdSet);
                for (const pdbId of mobileIds) {
                    if (align && pdbId === referenceId) continue;
                    try {
                        let mobileFileInfo = await loadPdbIdToFileInfo(pdbId);
                        if (align && referenceFileInfo) {
                            const aligned = await alignFileInfos(referenceFileInfo, [
                                mobileFileInfo,
                            ]);
                            if (aligned.length > 0) {
                                mobileFileInfo = aligned[0];
                                mobileFileInfo.name = `${pdbId}-aligned-to-${referenceTitle}.pdb`;
                            } else {
                                console.warn(`Alignment failed for ${pdbId}, loading unaligned structure.`);
                            }
                        }
                        await this.addFileInfoToViewer({
                            fileInfo: mobileFileInfo,
                            tag: this.pluginId,
                        });
                    } catch (error) {
                        console.error(`Failed to load or process PDB ID ${pdbId}:`, error);
                    }
                }
            }
        } catch (error) {
            messagesApi.popupError(
                "An unexpected error occurred while downloading and aligning structures."
            );
        } finally {
            messagesApi.stopWaitSpinner(spinnerId);
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
        const fastaText1 = `>my_protein
MQIFVKTLTGKTITLEVEPSDTIENVK\nAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG`;
        const fastaText2 = `>MCHU - Calmodulin - Human, rabbit, bovine, rat, and chicken
MADQLTEEQIAEFKEAFSLFDKDGDGTITTKELGTVMRSLGQNPTEAELQDMINEVDADGNGTID
FPEFLTMMARKMKDTDSEEEIREAFRVFDKDGNGYISAAELRHVMTNLGEKLTDEEVDEMIREA
DIDGDGQVNYEEFVQMMTAK*`;
        const rawSeq1 =
            "MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG";
        const rawSeq2 =
            "MADQLTEEQIAEFKEAFSLFDKDGDGTITTKELGTVMRSLGQNPTEAELQDMINEVDADGNGTIDFPEFLTMMARKMKDTDSEEEIREAFRVFDKDGNGYISAAELRHVMTNLGEKLTDEEVDEMIREADIDGDGQVNYEEFVQMMTAK";
        const tests: ITest[] = [
            // Test 1: Project Search and Download (with Alignment)
            {
                beforePluginOpens: () => new TestCmdList().loadExampleMolecule(true, pdb1xdn),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "1S68")
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "1S68-aligned-to-1XDN"),
            },
            // Test 2: FASTA text search with alignment
            {
                // Failed: findsimilarproteins #2 #modal-findsimilarproteins #fastaText-findsimilarproteins-item not found after 50 seconds.

                beforePluginOpens: () => new TestCmdList().loadExampleMolecule(true),
                pluginOpen: () => new TestCmdList()
                    .setUserArg("inputType", "Use FASTA text", this.pluginId)
                    .setUserArg("fastaText", fastaText1, this.pluginId)
                    .setUserArg("max_results", 3, this.pluginId),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "1AAR")
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "1D3Z-aligned-to-1AAR")
                    .waitUntilRegex("#navigator", "1CMX-aligned-to-1AAR"),
            },
            // Test 3: FASTA text with just sequence, no header, without alignment
            {
                pluginOpen: () => new TestCmdList()
                    // .setUserArg("inputType", "Use FASTA text", this.pluginId)
                    .setUserArg("fastaText", rawSeq1, this.pluginId)
                    .setUserArg("evalue_cutoff", 10, this.pluginId)
                    .setUserArg("max_results", 2, this.pluginId)
                    .click("#modal-findsimilarproteins #alignStructures-findsimilarproteins-item"),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "1AAR")
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "1AAR") // Reference
                    .waitUntilRegex("#navigator", '1CMX'), // Mobile
            },
            // Test 4: Two proteins from project
            {
                beforePluginOpens: () => new TestCmdList()
                    .loadExampleMolecule(true, pdb1xdn)
                    .loadExampleMolecule(true, pdb4wp4),
                pluginOpen: () => new TestCmdList()
                    .setUserArg("max_results", 2, this.pluginId),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "1HEV") // From 1XDN
                    .waitUntilRegex("#modal-tabledatapopup", "1Q9B") // From 4WP4
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "1S68-aligned-to-1XDN")
                    .waitUntilRegex("#navigator", "1Q9B-aligned-to-4WP4"),
            },
            // Test 5: Two full FASTA sequences
            {
                beforePluginOpens: () => new TestCmdList()
                    .loadExampleMolecule(),
                pluginOpen: () => new TestCmdList()
                    .setUserArg("inputType", "Use FASTA text", this.pluginId)
                    .setUserArg(
                        "fastaText",
                        `${fastaText1}\n${fastaText2}`,
                        "findsimilarproteins"
                    )
                    .setUserArg("max_results", 2, this.pluginId),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "1AAR")
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "1CMX-aligned-to-1AAR") // From fastaText1
                    .waitUntilRegex("#navigator", "1LVC-aligned-to-1IQ5"), // From fastaText2 (Calmodulin)
            },
            // Test 6: Two raw sequences
            {
                beforePluginOpens: () => new TestCmdList()
                    .loadExampleMolecule(undefined),
                pluginOpen: () => new TestCmdList()
                    .setUserArg("inputType", "Use FASTA text", this.pluginId)
                    .setUserArg(
                        "fastaText",
                        `${rawSeq1}\n\n${rawSeq2}`,
                        "findsimilarproteins"
                    )
                    .setUserArg("max_results", 2, this.pluginId),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "1AAR")
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "1CMX-aligned-to-1AAR") // From rawSeq1
                    .waitUntilRegex("#navigator", "1LVC-aligned-to-1IQ5"), // From rawSeq2 (Calmodulin)
            },
            // Test 7: Open with no proteins, should default to FASTA and run
            {
                // No beforePluginOpens, so project is empty
                pluginOpen: () => new TestCmdList()
                    .setUserArg("fastaText", fastaText1, this.pluginId) // This will only work if fastaText is enabled
                    .setUserArg("max_results", 1, this.pluginId),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "1AAR")
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "1AAR"),
            },
            // Test 8: Search WITHOUT Has Ligands (should find 1G6L and 2WHH)
            {
                beforePluginOpens: () => new TestCmdList().loadExampleMolecule(true, "https://files.rcsb.org/view/1AJV.pdb"),
                pluginOpen: () => new TestCmdList(),
                    // .setUserArg("max_results", 25, this.pluginId),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "2WHH")  // has ligands
                    .waitUntilRegex("#modal-tabledatapopup", "1G6L")  // no ligands
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "2WHH-aligned-to-1AJV"),
            },
            // Test 9: Search WITH Has Ligands (should find 2WHH but NOT 1G6L)
            {
                beforePluginOpens: () => new TestCmdList().loadExampleMolecule(true, "https://files.rcsb.org/view/1AJV.pdb"),
                pluginOpen: () => new TestCmdList()
                    .click("#modal-findsimilarproteins #has_ligands-findsimilarproteins-item"),
                    // .setUserArg("max_results", 25, this.pluginId),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex("#modal-tabledatapopup", "2WHH")  // has ligands
                    .waitUntilNotRegex("#modal-tabledatapopup", "1G6L")  // no ligands
                    .click("#modal-tabledatapopup .cancel-btn")
                    .waitUntilRegex("#navigator", "2WHH-aligned-to-1AJV"),
            },
        ];
        return tests;
    }
}
</script>