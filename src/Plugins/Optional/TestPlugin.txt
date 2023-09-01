<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
    ></PluginComponent>
</template>

<script lang="ts">
import { FileInfo } from "@/FileSystem/FileInfo";
import { convertFileInfosOpenBabel } from "@/FileSystem/OpenBabel/OpenBabel";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import {
    UserArg,
    UserArgType,
    IUserArgGroup,
    IUserArgMoleculeInputParams,
    IUserArgNumber,
    IUserSelectRegion,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { Options } from "vue-class-component";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { ITest } from "@/Testing/TestCmd";

/**
 * TestPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class TestPlugin extends PluginParentClass {
    menuPath = "Test/Test Component...";
    title = "Load Molecule from PubChem";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "testplugin";

    intro = `This is a <b>test</b> component.`;

    userArgDefaults: UserArg[] = [
        {
            id: "group2",
            // type: UserArgType.Group,
            label: "Region Test",
            val: [
                {
                    id: "region",
                    // label: "Region test",
                    val: null, // To use default
                    type: UserArgType.SelectRegion,
                } as IUserSelectRegion,
            ],
            startOpened: true,
        } as IUserArgGroup,

        {
            // type: UserArgType.Number,
            id: "moose",
            label: "Moose",
            val: 0,
        } as IUserArgNumber,
        {
            // type: UserArgType.MoleculeInputParams,
            id: "makemolinputparams",
            val: new MoleculeInput({ compoundFormat: "can" }),
        } as IUserArgMoleculeInputParams,
        {
            id: "group",
            // type: UserArgType.Group,
            label: "Labelme",
            val: [
                {
                    // type: UserArgType.Number,
                    id: "moose2",
                    label: "Moose2",
                    val: 0,
                },
                {
                    // type: UserArgType.Text,
                    id: "moose3",
                    label: "Moose3",
                    val: "face",
                },
            ],
            startOpened: true,
        } as IUserArgGroup,
    ];

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
        const jobParams = [];
        for (let i = 0; i < 1; i++) {
            const jobParam = {
                delay: Math.random() * 10000, // ms
            };
            jobParams.push(jobParam);
        }
        this.submitJobs(jobParams, Math.round(Math.random() * 2)); // , 10000);
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @param {any} _args  The user arguments to pass to the "executable."
     * @returns {Promise<undefined>}  A promise that resolves when the job is
     *     done.
     */
    runJobInBrowser(_args: any): Promise<void> {
        // let args: string[] = ['-:CO(=O)', '--gen2D', '-osdf', '-p', '7.4'];
        // let args: string[] = ['-H'];

        const canFile = new FileInfo({
            name: "test.can",
            contents: "CCCCC(=O)O",
        });

        return convertFileInfosOpenBabel([canFile], "smi", false, 15)
            .then((/* res: any */) => {
                debugger;
                // console.log(res);
                return;
            })
            .catch((err: any) => {
                throw err;
            });

        // let beforeOBFunc = (openbabel: any) => {
        //     openbabel.files.writeFile("/test.can", "c1cccccc1");
        // };

        // let afterOBFunc = (openbabel: any) => {
        //     return openbabel.files.readFile("test.pdb");
        // };

        // return runOpenBabel(
        //     // ["-:CO(=O)", "-ocan", "-p", "7.4", "--gen2D"],
        //     ["-:CO(=O)", "-O", "/test.pdb", "-p", "7.4"],
        //     [
        //         new FileInfo({
        //             name: "test.can",
        //             contents: "c1cccccc1",
        //         }),
        //     ],
        //     "test.pdb"
        // )
        //     .then((res: any) => {
        //         debugger;
        //         // console.log(res);
        //         return undefined;
        //     })
        //     .catch((err: any) => {
        //         throw err;
        //     });
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    getTests(): ITest[] {
        // No tests for this simple plugin.
        return [];
    }
}
</script>

<style scoped lang="scss"></style>
