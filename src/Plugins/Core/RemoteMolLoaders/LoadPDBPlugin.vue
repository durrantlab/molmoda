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
import {
    PluginParentClass,
    RunJobReturn,
} from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg, IUserArgText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { ITest } from "@/Testing/TestCmd";
import { FileInfo } from "@/FileSystem/FileInfo";
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

    intro = `Load a molecular structure from the <a href="https://www.rcsb.org/" target="_blank">Protein Data Bank</a>, a database of biological molecules (e.g., proteins and nucleic acids).`;

    hotkey = "d";

    userArgDefaults: UserArg[] = [
        {
            id: "pdbId",
            label: "",
            val: "",
            placeHolder: "Enter PDB ID (e.g., 1XDN)",
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
     * @returns {RunJobReturn}  A promise that resolves the file object.
     */
    runJobInBrowser(pdbId: string): RunJobReturn {
        return loadRemote(
            `https://files.rcsb.org/view/${pdbId.toUpperCase()}.pdb`
        )
            .then((fileInfo: FileInfo): any => {
                return this.addFileInfoToViewer(fileInfo);
            })
            .catch((err: string) => {
                // TODO: Check if CIF exists?
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
                "pdbId",
                "1XDN",
                this.pluginId
            ),
            afterPluginCloses: new TestCmdList().waitUntilRegex(
                "#navigator",
                "1XDN"
            ),
        };
    }
}
</script>

<style scoped lang="scss">
.inverse-indent {
    text-indent: -1em;
    padding-left: 1em;
}
</style>
