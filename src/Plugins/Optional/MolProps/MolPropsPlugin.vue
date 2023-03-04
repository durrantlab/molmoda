<template>
    <PluginComponent
        :userArgs="userArgs"
        v-model="open"
        title="Calculate Molecular Properties"
        :intro="intro"
        @onPopupDone="onPopupDone"
        :pluginId="pluginId"
        actionBtnTxt="Calculate"
    >
        <template #afterForm>
            <Alert type="info"
                >Once calculated, the molecular properties will appear in the
                Data tab{{ tableNames }}</Alert
            >
        </template>
    </PluginComponent>
</template>

<script lang="ts">
import { FileInfo } from "@/FileSystem/FileInfo";
import { checkAnyMolLoaded } from "@/Plugins/Core/CheckUseAllowedUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import {
    FormElement,
    IFormMoleculeInputParams,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import Alert from "@/UI/Layout/Alert.vue";
import { Options } from "vue-class-component";
import {
    calcMolProps,
    countsTitle,
    lipinskiTitle,
    otherTitle,
} from "./CalcMolProps";

/**
 * TestPlugin
 */
@Options({
    components: {
        PluginComponent,
        Alert,
    },
})
export default class MolPropsPlugin extends PluginParentClass {
    menuPath = "Compounds/Properties";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Jacob D. Durrant",
            url: "http://durrantlab.com/",
        },
    ];
    pluginId = "molprops";

    intro = `This plugin identifies small-molecule compounds and calculates their molecular properties.`;

    userArgs: FormElement[] = [
        {
            // type: FormElemType.MoleculeInputParams,
            id: "makemolinputparams",
            val: new MoleculeInput({
                compoundFormat: "can",
                considerProteins: false,
                batchSize: null,
            }),
        } as IFormMoleculeInputParams,
    ];

    /**
     * Get the names of the tables that will be created
     *
     * @returns {string} The names of the tables that will be created
     */
    get tableNames(): string {
        return `, in tables named "${lipinskiTitle}," "${countsTitle}," and "${otherTitle}."`;
    }

    /**
     * Runs before the popup opens. Starts importing the modules needed for the
     * plugin.
     */
    onBeforePopupOpen() {
        // You're probably going to need open babel and rdkitjs
        // dynamicImports.rdkitjs.module;
        // dynamicImports.openbabeljs.module;
    }

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        return checkAnyMolLoaded();
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     *
     * @param {IUserArg[]} userArgs  The user arguments.
     */
    onPopupDone(userArgs: IUserArg[]) {
        const compoundBatches: FileInfo[][] = this.getArg(
            userArgs,
            "makemolinputparams"
        );
        this.submitJobs(compoundBatches); // , 10000);
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @param {FileInfo[]} compoundBatch  The user arguments to pass to the "executable."
     *                             Contains compound information.
     * @returns {Promise<undefined>}  A promise that resolves when the job is
     *     done.
     */
    runJobInBrowser(compoundBatch: FileInfo[]): Promise<undefined | void> {
        // Convert all the fileInfos to the can format.
        const canPromises = compoundBatch.map((fileInfo) =>
            fileInfo.convertFromPDBTxt("can")
        );

        return Promise.all(canPromises)
            .then((fileInfos: FileInfo[]) => {
                calcMolProps(
                    fileInfos.map((f) => f.contents),
                    fileInfos.map((f) => f.treeNode)
                );
                return;
            })
            .catch((err: any): void => {
                throw err;
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
            beforePluginOpens: new TestCmdList()
              .loadExampleProtein(true).cmds,
            // closePlugin: [],
            afterPluginCloses: [],
        };
    }
}
</script>

<style scoped lang="scss"></style>
