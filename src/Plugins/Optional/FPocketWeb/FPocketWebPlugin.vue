<template>
    <PluginComponent
        :userArgs="userArgs"
        v-model="open"
        title="Pocket Detection"
        :intro="intro"
        @onPopupDone="onPopupDone"
        :pluginId="pluginId"
        actionBtnTxt="Detect"
    >
        <!-- <template #afterForm>
      <Alert type="info"
        >Once calculated, the molecular properties will appear in the Data tab{{
          tableNames
        }}</Alert
      >
    </template> -->
    </PluginComponent>
</template>

<script lang="ts">
import { dynamicImports } from "@/Core/DynamicImports";
import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { FileInfo } from "@/FileSystem/FileInfo";
import { parseMoleculeFile } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import { checkAnyMolLoaded } from "@/Plugins/Core/CheckUseAllowedUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import {
    FormElement,
    IFormMoleculeInputParams,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import Alert from "@/UI/Layout/Alert.vue";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { mergeMolContainers } from "@/UI/Navigation/TreeView/TreeUtils";
import { Options } from "vue-class-component";
import { defaultFpocketParams, IFpocketParams } from "./FPocketWebTypes";

/**
 * FPocketWebPlugin
 */
@Options({
    components: {
        PluginComponent,
        Alert,
    },
})
export default class FPocketWebPlugin extends PluginParentClass {
    menuPath = "Test/FPocketWeb";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Jacob D. Durrant",
            url: "http://durrantlab.com/",
        },
    ];
    pluginId = "fpocketweb";

    intro = `This plugin identifies small-molecule compounds and calculates their molecular properties.`;

    userArgs: FormElement[] = [
        {
            // type: FormElemType.MoleculeInputParams,
            id: "makemolinputparams",
            val: new MoleculeInput({
                considerCompounds: false,
                considerProteins: true,
                proteinFormat: "pdb",
            }),
        } as IFormMoleculeInputParams,
    ];

    // /**
    //  * Get the names of the tables that will be created
    //  *
    //  * @returns {string} The names of the tables that will be created
    //  */
    // get tableNames(): string {
    //   // return `, in tables named "${lipinskiTitle}," "${countsTitle}," and "${otherTitle}."`;
    //   return "";
    // }

    /**
     * Runs before the popup opens. Starts importing the modules needed for the
     * plugin.
     */
    onBeforePopupOpen() {
        // You're probably going to need fpocketweb
        // dynamicImports.fpocketweb.module;
    }

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        // TODO: Should be protein only
        return checkAnyMolLoaded();
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     *
     * @param {IUserArg[]} userArgs  The user arguments.
     */
    onPopupDone(userArgs: IUserArg[]) {
        const pdbFiles: FileInfo[][] = this.getArg(
            userArgs,
            "makemolinputparams"
        );
        this.submitJobs(pdbFiles); // , 10000);
    }

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @param {FileInfo} pdbFile  The user arguments to pass to the
     *                            "executable." Contains compound information.
     * @returns {Promise<any>}  A promise that resolves when the job is
     *     done.
     */
    runJobInBrowser(pdbFile: FileInfo): Promise<any> {
        const worker = new Worker(
            new URL("./FPocketWeb.worker", import.meta.url)
        );

        return runWorker(worker, {
            pdbName: pdbFile.name,
            pdbContents: pdbFile.contents,
        })
            .then((payload: any) => {
                const outPdbFileTxt = payload.outPdbFileTxt;
                const stdOut = payload.stdOut;
                const stdErr = payload.stdErr;
                const pocketsContents = payload.pocketsContents;

                const fileInfos = [
                    new FileInfo({
                        name: "outPdbFileTxt.pdb",
                        contents: outPdbFileTxt,
                    }),
                    new FileInfo({
                        name: "pocketsContents.pqr",
                        contents: pocketsContents,
                    }),
                ];

                const molPromises = fileInfos.map(
                    (f) =>
                        parseMoleculeFile(f, false) as Promise<IMolContainer[]>
                );

                return Promise.all(molPromises);
            })
            .then((mols: IMolContainer[][]) => {
                const outPdbFileTxtMol = mols[0][0];
                const pocketsContentsMol = mols[1][0];

                debugger;

                // Merge them TODO: NOT MERGING PROPERLY
                const mergedMols = mergeMolContainers([
                    outPdbFileTxtMol,
                    pocketsContentsMol,
                ]);

                // Add to molecules
                this.$store.commit("pushToList", {
                    name: "molecules",
                    val: mergedMols,
                });

                // debugger;
                return;
            });
    }
}
</script>

<style scoped lang="scss"></style>
