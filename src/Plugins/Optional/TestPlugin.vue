<template>
    <PluginComponent
        :userArgs="userArgs"
        v-model="open"
        :title="title"
        :intro="intro"
        @onPopupDone="onPopupDone"
        :pluginId="pluginId"
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
    FormElement,
    FormElemType,
    IFormGroup,
    IFormMoleculeInputParams,
    IFormNumber,
    IFormSelectRegion,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { Options } from "vue-class-component";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";

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

    userArgs: FormElement[] = [
        {
            id: "group2",
            // type: FormElemType.Group,
            label: "Region Test",
            childElements: [
                {
                    id: "region",
                    // label: "Region test",
                    val: null,  // To use default
                    type: FormElemType.SelectRegion,
                } as IFormSelectRegion,
            ],
            startOpened: true,
        } as IFormGroup,

        {
            // type: FormElemType.Number,
            id: "moose",
            label: "Moose",
            val: 0,
        } as IFormNumber,
        {
            // type: FormElemType.MoleculeInputParams,
            id: "makemolinputparams",
            val: new MoleculeInput({ compoundFormat: "can" }),
        } as IFormMoleculeInputParams,
        {
            id: "group",
            // type: FormElemType.Group,
            label: "Labelme",
            childElements: [
                {
                    // type: FormElemType.Number,
                    id: "moose2",
                    label: "Moose2",
                    val: 0,
                },
                {
                    // type: FormElemType.Text,
                    id: "moose3",
                    label: "Moose3",
                    val: "face",
                },
            ],
            startOpened: true,
        } as IFormGroup,
    ];

    /**
     * Runs when the user presses the action button and the popup closes.
     *
     * @param {IUserArg[]} userArgs  The user arguments.
     */
    onPopupDone(/* userArgs: IUserArg[] */) {
        // * @param {IUserArg[]} userArgs  The user arguments.
        // debugger;
        // this.submitJobs([userArgs]);
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
     * @param {IUserArg[]} _args  The user arguments to pass to the "executable."
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
}
</script>

<style scoped lang="scss"></style>
