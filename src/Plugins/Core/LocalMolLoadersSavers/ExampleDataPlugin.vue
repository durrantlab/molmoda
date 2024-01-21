<template>
    <PluginComponent
        :infoPayload="infoPayload"
        v-model="open"
        cancelBtnTxt="Cancel"
        actionBtnTxt="Append Example Project"
        @onPopupDone="onPopupDone"
        :isActionBtnEnabled="true"
        @onUserArgChanged="onUserArgChanged"
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
import { filesToFileInfos } from "@/FileSystem/Utils";
import { dynamicImports } from "@/Core/DynamicImports";
import { appName } from "@/Core/GlobalVars";

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
    menuPath = "File/[1] Project/[6] Example...";
    title = "Append Example Project";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    filesToLoad: FileInfo[] = [];
    pluginId = "openexampleproject";

    exampleDescriptions: { [key: string]: string } = {
        "1INW_just_prot_lig.biotite":
            "Influenza neuraminidase bound to a sialic-acid analog (PDB: 1INW). All molecular components except the protein and analog have been removed.",
        "1INW_pocket.biotite":
            "Influenza neuraminidase bound to a sialic-acid analog, with the binding pocket identified using Proteins → Detect Pockets...",
        "1INW_pocket_prot_protonated.biotite":
            "Influenza neuraminidase bound to a sialic-acid analog, with the protein protonated at pH 7 using Proteins → Protonation...",
        "1INW_pocket_prot_protonated_pubchem_ligs.biotite":
            "Protonated influenza neuraminidase bound to a sialic-acid analog, with additional neuraminidase ligands imported via File → PubChem...",
        "1INW_pocket_prot_protonated_ligs_protonated.biotite":
            "Protonated influenza neuraminidase, with known ligands protonated at pH 7 using Compounds → Protonation... (Use this example data to test docking.)",
        "1INW_pocket_prot_protonated_ligs_protonated_docked.biotite":
            "Protonated influenza neuraminidase, with known ligands docked into the neuraminidase pocket using Docking → Compound Docking...",
    };

    userArgDefaults: UserArg[] = [
        {
            id: "which_example_data",
            type: UserArgType.Select,
            label: "Example data to load",
            options: [
                {
                    description: "1INW protein/ligand complex",
                    val: "1INW_just_prot_lig.biotite",
                },
                {
                    description: "1INW, binding pocket identified",
                    val: "1INW_pocket.biotite",
                },
                {
                    description: "1INW, pocket, protein protonated",
                    val: "1INW_pocket_prot_protonated.biotite",
                },

                {
                    description:
                        "1INW, pocket, protein protonated, PubChem ligands",
                    val: "1INW_pocket_prot_protonated_pubchem_ligs.biotite",
                },

                {
                    description: "1INW, pocket, protein and ligands protonated",
                    val: "1INW_pocket_prot_protonated_ligs_protonated.biotite",
                },

                {
                    description:
                        "1INW, pocket, protein and ligands protonated, docked",
                    val: "1INW_pocket_prot_protonated_ligs_protonated_docked.biotite",
                },
            ],
            val: "1INW_just_prot_lig.biotite",
        } as IUserArgSelect,
        {
            id: "descript",
            type: UserArgType.Alert,
            val: this.exampleDescriptions["1INW_just_prot_lig.biotite"],
            alertType: "info",
        } as IUserArgAlert,
    ];
    alwaysEnabled = true;
    intro = `Append an example project to the current workspace. Useful for exploring and testing the ${appName} interface.`;

    /**
     * Detects when user arguments have changed, and updates UI accordingly.
     */
    onUserArgChange() {
        let whichExample = this.getUserArg("which_example_data") as string;
        this.setUserArg("descript", this.exampleDescriptions[whichExample]);
        console.log(this.exampleDescriptions[whichExample]);
        // // this.setUserArgEnabled("molMergingGroup", !useBiotite);
        // this.setUserArgEnabled("whichMolsGroup", !useBiotite);
        // this.setUserArgEnabled("separateCompounds", !useBiotite);

        // // Show onemol format or protein format, depending on whether
        // // mergeAllMolecules is true.
        // let separateCompounds = this.getUserArg("separateCompounds") as boolean;
        // this.setUserArgEnabled(
        //     "oneMolFileFormat",
        //     !separateCompounds && !useBiotite
        // );
        // this.setUserArgEnabled(
        //     "nonCompoundFormat",
        //     separateCompounds && !useBiotite
        // );

        // // If separating out compounds, show compound format.
        // this.setUserArgEnabled(
        //     "compoundFormat",
        //     separateCompounds && !useBiotite
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

        // Fetch the file "./example.biotite" file using fetch. It is a binary
        // file.
        const axios = await dynamicImports.axios.module;
        const path = this.getUserArg("which_example_data");
        const response = await axios.get(path, {
            responseType: "arraybuffer",
        });

        // Convert to blob
        const blob = new Blob([response.data], {
            type: "application/octet-stream",
        }); // You can adjust the type if needed.

        // Convert to a file
        const file = new File([blob], "example.biotite");

        // Convert file to fileInfo
        return filesToFileInfos([file], false, ["BIOTITE"]).then(
            (fileInfos: (FileInfo | string)[]) => {
                this.addFileInfoToViewer(fileInfos[0] as FileInfo);
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
    getTests(): ITest[] {
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
