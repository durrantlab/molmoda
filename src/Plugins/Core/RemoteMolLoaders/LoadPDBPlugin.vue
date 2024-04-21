<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        actionBtnTxt="Load"
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
    ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { loadRemote } from "./Utils";
import * as api from "@/Api";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg, IUserArgText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";

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
    title = "Load PDB ID";
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

    intro = `Load a molecule from the <a href="https://www.rcsb.org/" target="_blank">Protein Data Bank</a>, a database of proteins, nucleic acids, etc.`;

    hotkey = "d";

    userArgDefaults: UserArg[] = [
        {
            id: "pdbId",
            label: "",
            val: "",
            placeHolder: "PDB ID (e.g., 1XDN)...",
            description: `The PDB ID of the molecular structure. Search the <a href="https://www.rcsb.org/" target="_blank">Protein Data Bank</a> if you're uncertain.`,
            filterFunc: (pdb: string): string => {
                pdb = pdb.toUpperCase();
                pdb = pdb.replace(/[^A-Z\d]/g, ""); // Only nums and lets
                pdb = pdb.substring(0, 4);
                return pdb;
            },
            validateFunc: (pdb: string): boolean => {
                return pdb.length === 4;
            },
        } as IUserArgText,
    ];

    alwaysEnabled = true;

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
     * @param {string} pdbId  The PDB ID to load.
     * @returns {Promise<void>}  A promise that resolves the file object.
     */
    async runJobInBrowser(pdbId: string): Promise<void> {
        try {
            const url = `https://files.rcsb.org/view/${pdbId.toUpperCase()}.pdb`;
            const fileInfo = await loadRemote(url);
            return this.addFileInfoToViewer({ fileInfo, tag: this.pluginId });
        } catch (err) {
            console.warn(err);
        }

        // If you get here, it failed. Try CIF.
        try {
            const url = `https://files.rcsb.org/view/${pdbId.toUpperCase()}.cif`;
            const fileInfo2 = await loadRemote(url);
            return this.addFileInfoToViewer({
                fileInfo: fileInfo2,
                tag: this.pluginId,
            });
        } catch (err: any) {
            // Failed a second time! Probably not a valid PDB.

            api.messages.popupError(
                "Could not load PDB ID " +
                    pdbId +
                    ". Are you sure this ID is valid?"
            );
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
                pluginOpen: new TestCmdList().setUserArg(
                    "pdbId",
                    "1XDN",
                    this.pluginId
                ),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "1XDN"
                ),
            },

            // Below loads cif verson
            {
                pluginOpen: new TestCmdList().setUserArg(
                    "pdbId",
                    "7VBA",
                    this.pluginId
                ),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "7VBA"
                ),
            },

            // Check error checking
            {
                pluginOpen: new TestCmdList().setUserArg(
                    "pdbId",
                    "9999",
                    this.pluginId
                ),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#modal-simplemsg",
                    "Could not load"
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
