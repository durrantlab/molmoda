<template>
    <PluginComponent
        :infoPayload="infoPayload"
        v-model="open"
        cancelBtnTxt="Cancel"
        actionBtnTxt="Append Example Data"
        @onPopupDone="onPopupDone"
        :isActionBtnEnabled="true"
        @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"
    >
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import FormFile from "@/UI/Forms/FormFile.vue";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    IUserArgAlert,
    IUserArgSelect,
    UserArg,
    UserArgType,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TestCmdList } from "@/Testing/TestCmdList";
import { filesToFileInfos } from "@/FileSystem/FileUtils";
import { appName } from "@/Core/GlobalVars";
import { ResponseType, fetcher } from "@/Core/Fetcher";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";

/**
 * ExampleDataPlugin
 */
@Options({
    components: {
        PluginComponent,
        FormFile,
    },
})
export default class ExampleDataPlugin extends PluginParentClass {
    menuPath = "Help/[6] Example Data/[6] Example Data...";
    title = "Append Example Data";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    filesToLoad: FileInfo[] = [];
    pluginId = "openexampleproject";
    tags = [Tag.All];

    exampleDescriptions: { [key: string]: string } = {
        "1INW_just_prot_lig.molmoda":
            "Influenza neuraminidase bound to a sialic-acid analog (PDB: 1INW). All molecular components except the protein and analog have been removed.",
        "1INW_pocket.molmoda":
            "Influenza neuraminidase bound to a sialic-acid analog, with the binding pocket identified using Proteins → Detect Pockets...",
        "1INW_pocket_prot_protonated.molmoda":
            "Influenza neuraminidase bound to a sialic-acid analog, with the protein protonated at pH 7 using Proteins → Protonation...",
        "1INW_pocket_prot_protonated_pubchem_ligs.molmoda":
            "Protonated influenza neuraminidase bound to a sialic-acid analog, with additional neuraminidase ligands imported via File → PubChem...",
        "1INW_pocket_prot_protonated_ligs_protonated.molmoda":
            "Protonated influenza neuraminidase, with known ligands protonated at pH 7 using Compounds → Protonation... (Use this example data to test docking.)",
        "1INW_pocket_prot_protonated_ligs_protonated_docked.molmoda":
            "Protonated influenza neuraminidase, with known ligands docked into the neuraminidase pocket using Docking → Compound Docking...",
        "TGFR1_docked.molmoda": `Virtual screen targeting TGFβ Type I Receptor Kinase, described in the ${appName} publication. (Use this example data to calculate ROC and EF curves.)`,
        "LARP1_leadopt.molmoda": `m7G and analogs bound to LARP1 DM15. Shows how ${appName} can assist in lead optimization, as described in the ${appName} publication.`,
    };

    userArgDefaults: UserArg[] = [
        {
            id: "which_example_data",
            type: UserArgType.Select,
            label: "Example data to append",
            options: [
                {
                    description: "1INW protein/ligand complex",
                    val: "1INW_just_prot_lig.molmoda",
                },
                {
                    description: "1INW, binding pocket identified",
                    val: "1INW_pocket.molmoda",
                },
                {
                    description: "1INW, pocket, protein protonated",
                    val: "1INW_pocket_prot_protonated.molmoda",
                },

                {
                    description:
                        "1INW, pocket, protein protonated, PubChem ligands",
                    val: "1INW_pocket_prot_protonated_pubchem_ligs.molmoda",
                },

                {
                    description: "1INW, pocket, protein and ligands protonated",
                    val: "1INW_pocket_prot_protonated_ligs_protonated.molmoda",
                },

                {
                    description:
                        "1INW, pocket, protein and ligands protonated, docked",
                    val: "1INW_pocket_prot_protonated_ligs_protonated_docked.molmoda",
                },
                {
                    description: `TGFR1 virtual screen (from ${appName} publication)`,
                    val: "TGFR1_docked.molmoda",
                },
                {
                    description: `LARP1 lead optimization (from ${appName} publication)`,
                    val: "LARP1_leadopt.molmoda",
                },
            ],
            val: "1INW_just_prot_lig.molmoda",
        } as IUserArgSelect,
        {
            id: "descript",
            type: UserArgType.Alert,
            val: this.exampleDescriptions["1INW_just_prot_lig.molmoda"],
            alertType: "info",
        } as IUserArgAlert,
    ];
    
    intro = `Append example data to the current workspace.`;
    details = `Useful for exploring and testing the ${appName} interface.`;

    /**
     * Detects when user arguments have changed, and updates UI accordingly.
     */
    onUserArgChange() {
        let whichExample = this.getUserArg("which_example_data") as string;
        this.setUserArg("descript", this.exampleDescriptions[whichExample]);
        console.log(this.exampleDescriptions[whichExample]);
        // // this.setUserArgEnabled("molMergingGroup", !useMolModa);
        // this.setUserArgEnabled("whichMolsGroup", !useMolModa);
        // this.setUserArgEnabled("separateCompounds", !useMolModa);

        // // Show onemol format or protein format, depending on whether
        // // mergeAllMolecules is true.
        // let separateCompounds = this.getUserArg("separateCompounds") as boolean;
        // this.setUserArgEnabled(
        //     "oneMolFileFormat",
        //     !separateCompounds && !useMolModa
        // );
        // this.setUserArgEnabled(
        //     "nonCompoundFormat",
        //     separateCompounds && !useMolModa
        // );

        // // If separating out compounds, show compound format.
        // this.setUserArgEnabled(
        //     "compoundFormat",
        //     separateCompounds && !useMolModa
        // );
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
        this.closePopup();
        this.submitJobs();
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     */
    async runJobInBrowser(): Promise<void> {
        // Load the example project

        // Fetch the file "./example.molmoda" file using fetch. It is a binary
        // file.
        const path = this.getUserArg("which_example_data");
        const data = await fetcher(path, {
            responseType: ResponseType.ARRAY_BUFFER,
        });

        // Convert to blob
        const blob = new Blob([data], {
            type: "application/octet-stream",
        }); // You can adjust the type if needed.

        // Convert to a file
        const file = new File([blob], "example.molmoda");

        // Convert file to fileInfo
        return filesToFileInfos([file], false, ["MOLMODA"]).then(
            (fileInfos: (FileInfo | string)[] | undefined) => {
                if (fileInfos === undefined) return;
                this.addFileInfoToViewer({
                    fileInfo: fileInfos[0] as FileInfo,
                    tag: this.pluginId,
                });
                return;
            }
        );
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commandss.
     */
    async getTests(): Promise<ITest[]> {
        return [
            // First test without saving first
            {
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "Compounds"
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
