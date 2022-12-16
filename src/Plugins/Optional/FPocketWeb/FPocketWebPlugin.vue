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
import { FileInfo } from "@/FileSystem/FileInfo";
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
        dynamicImports.fpocketweb.module;
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
     * @returns {Promise<undefined>}  A promise that resolves when the job is
     *     done.
     */
    runJobInBrowser(pdbFile: FileInfo): Promise<undefined | void> {
        dynamicImports.fpocketweb.module
            .then((FpocketWeb: any) => {
                FpocketWeb.start(
                    { ...defaultFpocketParams },
                    pdbFile.contents,
                    pdbFile.name,

                    // onDone
                    (
                        outPdbqtFileTxt: string,
                        stdOut: string,
                        stdErr: string,
                        pocketsContents: string
                    ) => {
                        this.$store.commit("setVar", {
                            name: "pqrContents",
                            val: pocketsContents,
                        });
                        this.$store.commit("setVar", {
                            name: "infoFile",
                            val: true,
                        });
                        debugger;
                        // this.afterWASM(outPdbqtFileTxt, stdOut, stdErr);
                    },

                    // onError
                    (errObj: any) => {
                        debugger;
                        // this.showFpocketWebError(errObj["message"]);
                    },
                    // TODO: This should be based on the url path.
                    // Utils.curPath() + "FpocketWeb/"
                    "js/fpocketweb/"
                );
                return;
            })
            .catch((err: any): void => {
                throw err;
            });
        return Promise.resolve(undefined);

        // Convert all the fileInfos to the can format.
        // const canPromises = compoundBatch.map((fileInfo) =>
        //   fileInfo.convertFromPDBTxt("can")
        // );

        // return Promise.all(canPromises)
        //   .then((fileInfos: FileInfo[]) => {
        //     return;
        //   })
        //   .catch((err: any): void => {
        //     throw err;
        //   });
    }
}
</script>

<style scoped lang="scss"></style>
