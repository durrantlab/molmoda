<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onPopupDone="onPopupDone"
        actionBtnTxt="Calculate"
        @onUserArgChanged="onUserArgChanged"
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
    UserArg,
    IUserArgMoleculeInputParams,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import Alert from "@/UI/Layout/Alert.vue";
import { Options } from "vue-class-component";
import {
    calcMolProps,
    countsTitle,
    lipinskiTitle,
    otherTitle,
} from "./CalcMolProps";
import { dynamicImports } from "@/Core/DynamicImports";

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
    menuPath = "Compounds/Calculate Properties...";
    title = "Calculate Molecular Properties";
    softwareCredits: ISoftwareCredit[] = [dynamicImports.rdkitjs.credit];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "molprops";

    intro = `Calculates the molecular properties of small-molecule compounds.`;

    userArgDefaults: UserArg[] = [
        {
            // type: UserArgType.MoleculeInputParams,
            id: "makemolinputparams",
            val: new MoleculeInput({
                compoundFormat: "can",
                considerProteins: false,
                batchSize: null,
            }),
        } as IUserArgMoleculeInputParams,
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
     * @returns {Promise<void>}  A promise that resolves when the popup is done.
     */
    onPopupDone(): Promise<void> {
        const compounds: FileInfo[] = this.getUserArg("makemolinputparams");

        // Make sure the filenames are unique.
        for (let i = 0; i < compounds.length; i++) {
            compounds[i].name = i.toString() + "_" + compounds[i].name;
        }

        return calcMolProps(
            compounds.map((f) => f.contents),
            compounds.map((f) => f.treeNode)
        )
            .then(() => {
                this.submitJobs();
                return;
            })
            .catch((err: any): void => {
                throw err;
            });
    }

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @returns {Promise<undefined>}  A promise that resolves when the job is
     *     done.
     */
    runJobInBrowser(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest}  The selenium test commands.
     */
    getTezts(): ITest {
        return {
            beforePluginOpens: new TestCmdList().loadExampleProtein(true).cmds,
            // closePlugin: [],
            afterPluginCloses: [],
        };
    }
}
</script>

<style scoped lang="scss"></style>
