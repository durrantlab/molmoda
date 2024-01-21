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
import { loadRemote } from "./Utils";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import * as api from "@/Api";
import { UserArg, IUserArgText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { ITest } from "@/Testing/TestCmd";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TestCmdList } from "@/Testing/TestCmdList";

/**
 * LoadAlphaFoldPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class LoadAlphaFoldPlugin extends PluginParentClass {
    menuPath = "File/Import/[4] AlphaFold...";
    title = "Load AlphaFold Structure";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //   name: "Jacob D. Durrant",
        //   url: "http://durrantlab.com/",
        // },
        {
            name: "AlphaFold Protein Structure Database",
            url: "https://alphafold.ebi.ac.uk/",
            citations: [
                {
                    title: "AlphaFold Protein Structure Database: massively expanding the structural coverage of protein-sequence space with high-accuracy models",
                    authors: ["Varadi, Mihaly", "Anyango, Stephen"],
                    journal: "Nucleic Acids Res.",
                    volume: 50,
                    issue: "D1",
                    year: 2022,
                    pages: "D439-D444",
                },
                {
                    title: "Highly accurate protein structure prediction with AlphaFold",
                    authors: ["Jumper, John", "Evans, Richard"],
                    journal: "Nature",
                    volume: 596,
                    issue: 7873,
                    year: 2021,
                    pages: "583-589",
                },
            ],
        },
    ];
    pluginId = "loadalphafold";

    intro = `Load a protein from the <a href="https://alphafold.ebi.ac.uk/" target="_blank">AlphaFold Protein Structure Database</a>, a database of predicted protein structures.`;

    userArgDefaults: UserArg[] = [
        {
            id: "uniprot",
            label: "",
            val: "",
            placeHolder: "Enter UniProt Accession (e.g., P86927)",
            description: `The UniProt Accession of the protein structure. Search the
      <a href="https://alphafold.ebi.ac.uk/" target="_blank">AlphaFold Protein Structure Database</a> if you're uncertain.`,
            filterFunc: (uniprot: string): string => {
                // https://www.uniprot.org/help/accession_numbers
                uniprot = uniprot.toUpperCase();
                uniprot = uniprot.replace(/[^A-Z\d]/g, "");
                uniprot = uniprot.substring(0, 10);
                return uniprot;
            },
            validateFunc: (uniprot: string): boolean => {
                // https://www.uniprot.org/help/accession_numbers
                let r =
                    /[OPQ]\d[A-Z\d]{3}\d|[A-NR-Z]\d([A-Z][A-Z\d]{2}\d){1,2}/;
                return uniprot.match(r) !== null;
            },
        } as IUserArgText,
    ];

    alwaysEnabled = true;

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
        let uniprot = this.getUserArg("uniprot");
        this.submitJobs([uniprot]);
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @param {string} uniprot  The requested uniprot id.
     * @returns {Promise<void>}  A promise that resolves the file object.
     */
    runJobInBrowser(uniprot: string): Promise<void> {
        return loadRemote(
            `https://alphafold.ebi.ac.uk/api/prediction/${uniprot.toUpperCase()}`
        )
            .then((fileInfo: FileInfo) => {
                let pdbUrl = (fileInfo.contents[0] as any)["pdbUrl"]; // TODO: When would there be more than one entry?
                if (pdbUrl) {
                    // Load the PDB file.
                    return loadRemote(pdbUrl);
                }
                // Throw error
                throw new Error("No PDB file found.");
            })
            .then((fileInfo: FileInfo): any => {
                return this.addFileInfoToViewer(fileInfo);
            })
            .catch((err: string) => {
                api.messages.popupError(err);
                // throw err;
            });
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest}  The selenium test commands.
     */
    getTests(): ITest {
        return {
            pluginOpen: new TestCmdList().setUserArg(
                "uniprot",
                "P86927",
                this.pluginId
            ),
            afterPluginCloses: new TestCmdList().waitUntilRegex(
                "#navigator",
                "P86927"
            ),

            // .waitUntilRegex("#styles", "Protein")
            // .waitUntilRegex("#log", 'Job loadalphafold.*? ended')
        };
    }
}
</script>

<style scoped lang="scss"></style>
