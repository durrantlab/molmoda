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
import { batchify } from "@/Core/Utils2";
import { FileInfo } from "@/FileSystem/FileInfo";
import { convertFileInfosOpenBabel } from "@/FileSystem/OpenBabel/OpenBabel";
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
    ICalcMolProps,
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
    menuPath = "Compounds/Calculate Properties";
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
     * @returns {Promise<void>}  A promise that resolves when the popup is done.
     */
    onPopupDone(userArgs: IUserArg[]): Promise<void> {
        const compoundBatches: FileInfo[][] = this.getArg(
            userArgs,
            "makemolinputparams"
        );

        // Be default, compoundBatches is a list of lists of fileInfos. But I
        // want to convert all these into smiles strings in bulk, so I'm going
        // to flatten the list.
        const origNumBatches = compoundBatches.length;
        const flattened: FileInfo[] = [];
        for (const batch of compoundBatches) {
            flattened.push(...batch);
        }

        // Make sure the filenames are unique.
        for (let i = 0; i < flattened.length; i++) {
            flattened[i].name = i.toString() + "_" + flattened[i].name;
        }

        return convertFileInfosOpenBabel(
            flattened, // Can be multiple-model SDF file, for example.
            "can"
        ).then((contents: string[]) => {
            // Update contents of each flattened fileInfo
            for (let i = 0; i < flattened.length; i++) {
                flattened[i].contents = contents[i];
            }

            // Rebatch the results and submit.
            const compoundBatches = batchify(flattened, origNumBatches);
            this.submitJobs(compoundBatches); // , 10000);
            return;
        });
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @param {FileInfo[]} compoundBatch  The user arguments to pass to the "executable."
     *                             Contains compound information.
     * @returns {Promise<undefined>}  A promise that resolves when the job is
     *     done.
     */
    runJobInBrowser(compoundBatch: FileInfo[]): Promise<void> {
        return calcMolProps(
            compoundBatch.map((f) => f.contents),
            compoundBatch.map((f) => f.treeNode)
        )
            .then(() => {
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
            beforePluginOpens: new TestCmdList().loadExampleProtein(true).cmds,
            // closePlugin: [],
            afterPluginCloses: [],
        };
    }
}
</script>

<style scoped lang="scss"></style>
