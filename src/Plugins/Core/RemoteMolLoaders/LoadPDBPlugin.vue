<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" actionBtnTxt="Load" @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged" @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { loadPdbIdToFileInfo } from "./RemoteMolLoadersUtils";
import * as api from "@/Api";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg, IUserArgText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { ITest } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";

/**
 * LoadPDBPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class LoadPDBPlugin extends PluginParentClass {
    menuPath = "File/[2] Import/[2] PDB ID...";
    title = "Load PDB IDs";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
        {
            name: "Protein Data Bank",
            url: "https://www.rcsb.org/",
            citations: [
                {
                    title: "The Protein Data Bank",
                    authors: ["Berman, H. M.", "Westbrook, J."],
                    journal: "Nucleic Acids Res.",
                    volume: 28,
                    year: 2000,
                    issue: 1,
                    pages: "235-242",
                },
            ],
        },
    ];
    pluginId = "loadpdb";
    skipLongRunningJobMsg = true;
    intro = `Load molecule(s) from the <a href="https://www.rcsb.org/" target="_blank">Protein Data Bank</a>, a database of proteins, nucleic acids, etc.`;
    details = "This plugin retrieves macromolecular structures from the PDB using their four-character identification codes.";

    hotkey = "d";
    tags = [Tag.All];

    userArgDefaults: UserArg[] = [
        {
            id: "pdbId",
            label: "",
            val: "",
            placeHolder: "PDB IDs (e.g., 1XDN 2HU4)...",
            description: `The PDB IDs of one or more molecular structures, separated by spaces. Search the <a href="https://www.rcsb.org/" target="_blank">Protein Data Bank</a> if you're uncertain.`,
            filterFunc: (pdb: string): string => {
                // commas, semicolons, colons should all be spaces
                pdb = pdb.replace(/[,;:]/g, " ");

                pdb = pdb.toUpperCase();
                pdb = pdb.replace(/[^A-Z \d]/g, ""); // Only nums and lets and space

                // Split on space
                const pdbPrts = pdb.split(" ");

                // Each one can only be 4 chars long
                pdbPrts.forEach((prt, i) => {
                    pdbPrts[i] = prt.substring(0, 4);
                });

                pdb = pdbPrts.join(" ");

                while (pdb.includes("  ")) {
                    pdb = pdb.replace("  ", " ");
                }

                return pdb;
            },
            validateFunc: (pdb: string): boolean => {
                // split on space and make sure all are 4 chars long
                const pdbPrts = pdb.trim().split(" ");

                // Each one can only be 4 chars long
                let resp = true;
                pdbPrts.forEach((prt) => {
                    if (prt.length !== 4) {
                        resp = false;
                    }
                });

                return resp;

                // return pdb.length === 4;
            },
        } as IUserArgText,
    ];

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
        const pdbId = this.getUserArg("pdbId");
        this.submitJobs([pdbId]);
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @param {string} pdbIds  The PDB IDs to load (separated by space).
     * @returns {Promise<void>}  A promise that resolves the file object.
     */
    async runJobInBrowser(pdbIds: string): Promise<void> {
        // TODO: With a little effort, you could refactor this so downloads all
        // pdbs in parallel. Currentl in serial.

        let pdbIdList = pdbIds.trim().split(" ");

        // remove duplicates
        pdbIdList = pdbIdList.filter((v, i, a) => a.indexOf(v) === i);

        for (const pdbId of pdbIdList) {
            const spinnerId = api.messages.startWaitSpinner();
            try {
                const fileInfo = await loadPdbIdToFileInfo(pdbId);
                await this.addFileInfoToViewer({
                    fileInfo,
                    tag: this.pluginId,
                });
            } catch (err: any) {
                // Failed a second time! Probably not a valid PDB.
                api.messages.popupError(
                    "Could not load PDB ID " +
                    pdbId +
                    ". Are you sure this ID is valid?"
                );
            } finally {
                api.messages.stopWaitSpinner(spinnerId);
            }
        }
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
                pluginOpen: () => new TestCmdList().setUserArg(
                    "pdbId",
                    "1XDN",
                    this.pluginId
                ),
                afterPluginCloses: () => new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "1XDN"
                ),
            },

            // Make sure you can load two at a time
            {
                pluginOpen: () => new TestCmdList().setUserArg(
                    "pdbId",
                    "1XDN 2HU4",
                    this.pluginId
                ),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex("#navigator", "1XDN")
                    .waitUntilRegex("#navigator", "2HU4"),
            },

            // Below loads cif verson
            {
                pluginOpen: () => new TestCmdList().setUserArg(
                    "pdbId",
                    "7VBA",
                    this.pluginId
                ),
                afterPluginCloses: () => new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "7VBA"
                ),
            },

            // Check error checking
            {
                pluginOpen: () => new TestCmdList().setUserArg(
                    "pdbId",
                    "9999",
                    this.pluginId
                ),
                afterPluginCloses: () => new TestCmdList().waitUntilRegex(
                    "#modal-simplemsg",
                    "Could not load"
                ),
            },
            {
                name: "Fallback to PDBe when RCSB fails (PDB)",
                beforePluginOpens: () => new TestCmdList().failUrl("rcsb.org"),
                pluginOpen: () => new TestCmdList().setUserArg("pdbId", "1XDN", this.pluginId),
                afterPluginCloses: () => new TestCmdList()
                    .waitUntilRegex("#navigator", "1XDN"),
            },
            {
                name: "Fallback to PDBe when RCSB fails (CIF)",
                pluginOpen: () => new TestCmdList().setUserArg(
                    "pdbId",
                    "7VBA",
                    this.pluginId
                ),
                afterPluginCloses: () => new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "7VBA"
                ),
            },

            {
                name: "Render problem is remove-GLModels-with-no-atoms fails",
                pluginOpen: () => new TestCmdList().setUserArg(
                    "pdbId",
                    "6rig",
                    this.pluginId
                ),
                afterPluginCloses: () => new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "6RIG"
                ),
            },

            {
                name: "Try to load a PDB that is too big",
                pluginOpen: () => new TestCmdList().setUserArg(
                    "pdbId",
                    "5YZG",
                    this.pluginId
                ),
                afterPluginCloses: () => new TestCmdList().waitUntilRegex(
                    "#modal-simplemsg",
                    "may be too large"
                ),
            },
            {
                name: "Merge bonded compounds (6LQ4)",
                pluginOpen: () => new TestCmdList().setUserArg(
                    "pdbId",
                    "6LQ4",
                    this.pluginId
                ),
                afterPluginCloses: () => new TestCmdList()
                    .openPlugin("expandall")
                    .waitUntilRegex(
                        "#navigator",
                        "MYR:702-COA:703"
                    ),
            },
        ];
    }
}
</script>

<style scoped lang="scss">
.inverse-indent {
    text-indent: -1em;
    padding-left: 1em;
}
</style>
