<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onPopupDone="onPopupDone" actionBtnTxt="Find"
        @onUserArgChanged="onUserArgChanged" :hideIfDisabled="true" @onMolCountsChanged="onMolCountsChanged">
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
    IUserArgNumber,
    IUserArgRange,
    IUserArgCheckbox,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { messagesApi } from "@/Api/Messages";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { FindSimilarProteinsQueue } from "./FindSimilarProteinsQueue";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { checkProteinLoaded } from "@/Plugins/CheckUseAllowedUtils";
import { loadPdbIdToFileInfo } from "@/Plugins/Core/RemoteMolLoaders/RemoteMolLoadersUtils";
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
    menuPath = "Proteins/Find Similar...";
    title = "Find Similar Proteins";
    pluginId = "findsimilarproteins";
    intro = "Find proteins with similar sequences using the RCSB PDB sequence search.";
    tags = [Tag.Modeling];
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
            val: 25,
            min: 1,
            max: 1000,
            description: "The maximum number of similar proteins to retrieve for each query.",
        } as IUserArgNumber,
        {
            id: "downloadStructures",
            type: UserArgType.Checkbox,
            label: "Download structures",
            description: "If checked, all found protein structures will be downloaded into the workspace.",
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

        const payloads = proteinFileInfos.map((fi) => ({
            proteinFileInfo: fi,
            evalue,
            identity,
            maxResults,
        }));

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
        const combinedResults = new Map<string, { score: number; queries: Set<string> }>();

        allJobOutputs.forEach((jobOutput: any) => {
            if (jobOutput.error) {
                console.error(`Error for ${jobOutput.query}: ${jobOutput.error}`);
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
                { text: "Found via Query" },
            ],
            rows: sortedResults.map(([pdbId, data]) => ({
                "PDB ID": `<a href="https://www.rcsb.org/structure/${pdbId}" target="_blank" rel="noopener noreferrer">${pdbId}</a>`,
                "Score": data.score.toFixed(4),
                "Found via Query": Array.from(data.queries).join(", "),
            })),
        };

        messagesApi.popupTableData(
            "Similar Proteins Found",
            `Found ${sortedResults.length} unique similar proteins.`,
            tableData,
            "Search Results"
        );
        const downloadStructures = this.getUserArg("downloadStructures") as boolean;
        if (downloadStructures) {
            const pdbIdsToLoad = sortedResults.map(([pdbId]) => pdbId);
            const spinnerId = messagesApi.startWaitSpinner();
            const chunkSize = 5; // To respect RCSB rate limits
            try {
                for (let i = 0; i < pdbIdsToLoad.length; i += chunkSize) {
                    const chunk = pdbIdsToLoad.slice(i, i + chunkSize);
                    const loadPromises = chunk.map(async (pdbId: string) => {
                        try {
                            const fileInfo = await loadPdbIdToFileInfo(pdbId);
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
     * @returns {Promise<ITest>} The test configuration.
     */
    async getTests(): Promise<ITest> {
        return {
            beforePluginOpens: new TestCmdList().loadExampleMolecule(),
            afterPluginCloses: new TestCmdList().waitUntilRegex(
                "#modal-tabledatapopup",
                "1S68"
            ),
        };
    }
}
</script>