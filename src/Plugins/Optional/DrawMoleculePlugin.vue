<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onUserArgChanged="onUserArgChanged"
        @onPopupDone="onPopupDone"
        modalWidth="xl"
        :isActionBtnEnabled="isActionBtnEnabled"
    >
        <div
            ref="chemComposer"
            style="width: 100%; height: 400px"
            @click="onWidgetClick"
        ></div>
        <!-- v-model="molName"
        @onChange="searchByName"
        :description="molNameRespDescription" -->
        <FormWrapper class="mt-2">
            <FormInput
                v-model="currentSmiles"
                ref="formMolName"
                id="formMolName"
                placeHolder="(Optional) Enter the Chemical Name (e.g., Aspirin)"
                :delayBetweenChangesDetected="0"
                :validateDescription="false"
                actionBtnTxt="Load SMILES"
                @onActionBtnClick="onActionBtnClick"
            >
            </FormInput>
        </FormWrapper>
        {{ currentSmiles }}
    </PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { Options } from "vue-class-component";

import { FileInfo } from "@/FileSystem/FileInfo";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import {
    ISoftwareCredit,
    IContributorCredit,
} from "@/Plugins/PluginInterfaces";
import { dynamicImports } from "@/Core/DynamicImports";
import { randomID } from "@/Core/Utils";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { isTest } from "@/Testing/SetupTests";
import { TestCmdList } from "@/Testing/TestCmdList";
import FormInput from "@/UI/Forms/FormInput.vue";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import { convertFileInfosOpenBabel } from "@/FileSystem/OpenBabel/OpenBabel";

/**
 * DrawMoleculePlugin
 */
@Options({
    components: {
        PluginComponent,
        FormInput,
        FormWrapper,
    },
})
export default class DrawMoleculePlugin extends PluginParentClass {
    menuPath = "File/Import/[8] Draw...";
    softwareCredits: ISoftwareCredit[] = [dynamicImports.kekule.credit];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Yuri K. Kochnev",
            url: "http://durrantlab.com/",
        },
    ];
    pluginId = "drawmoleculeplugin";
    title = "Draw Molecule";

    intro = `Use the editor below to draw a small-molecule compound.`;

    userArgDefaults: UserArg[] = [];
    currentSmiles = "";

    kekule: any;
    chemComposer: any;

    isActionBtnEnabled = false;

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     */
    onBeforePopupOpen() {
        dynamicImports.kekule.module
            .then((module: any) => {
                this.kekule = module.Kekule;
                this.chemComposer = new this.kekule.Editor.Composer(
                    this.$refs["chemComposer"]
                );
                this.chemComposer
                    .setEnableOperHistory(true)
                    .setEnableLoadNewFile(false)
                    .setEnableCreateNewDoc(false)
                    .setAllowCreateNewChild(false)
                    // create all default common tool buttons
                    .setCommonToolButtons([
                        // "newDoc",
                        "loadData",
                        // "saveData",
                        "undo",
                        "redo",
                        "copy",
                        "cut",
                        "paste",
                        "zoomIn",
                        "reset",
                        "zoomOut",
                        // "config",
                        // "objInspector",
                    ])
                    // create only chem tool buttons related to molecule
                    .setChemToolButtons([
                        "manipulate",
                        "erase",
                        "bond",
                        "atomAndFormula",
                        "ring",
                        "charge",
                    ])
                    // create all default style components
                    .setStyleToolComponentNames([
                        // "fontName",
                        // "fontSize",
                        // "color",
                        // "textDirection",
                        // "textAlign",
                    ]);

                // If it's a test, throw in a methane for testing.
                if (isTest) {
                    const cmlData = `<?xml version="1.0"?><molecule xmlns="http://www.xml-cml.org/schema"><atomArray><atom id="a1" elementType="C" hydrogenCount="4"/></atomArray></molecule>`;
                    const testMol = this.kekule.IO.loadFormatData(
                        cmlData,
                        "cml"
                    );
                    this.chemComposer.setChemObj(testMol);
                    this.isActionBtnEnabled = true;
                }

                // this.chemComposer.setDimension('200px', '200px');
                return;
            })
            .catch((err: any) => {
                throw err;
            });
    }

    /**
     * Loads a smiles string into the editor.
     *
     * @param {string} smi  The smiles string.
     * @returns {Promise<void>}  A promise that resolves when the smiles string
     *                           is loaded.
     */
    async loadFromSmiles(smi: string): Promise<void> {
        // Convert smi
        const fileInfo = new FileInfo({
            name: randomID() + ".smi",
            contents: smi,
        });

        debugger

        const contents = await convertFileInfosOpenBabel([fileInfo], "cml");
        const testMol = this.kekule.IO.loadFormatData(contents[0], "sdf");
        this.chemComposer.setChemObj(testMol);
        return
        // return contents[0];
        // const cmlData = `<?xml version="1.0"?><molecule xmlns="http://www.xml-cml.org/schema"><atomArray><atom id="a1" elementType="C" hydrogenCount="4"/></atomArray></molecule>`;
    }

    /**
     * Runs when the user presses the action button.
     */
    onActionBtnClick() {
        // Seems too challenging to load SMI file into kekule. Going to use
        // OpenBabel to convert to cml

        this.loadFromSmiles(this.currentSmiles);

        // this.kekule.OpenBabel.enable(() => {
        //     debugger;
        // });

        // this.kekule.OpenBabel.enable(() => {
        // debugger;
        // this.chemComposer
        //     .getEditor()
        //     .setChemObjData('{"format": "smi", "data": "C1CCCCC1"}');
        // });
        this.isActionBtnEnabled = true;
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
        const myFile = new FileInfo({
            name: randomID() + ".smi",
            contents: this.kekule.IO.saveFormatData(
                this.chemComposer.getChemObj(),
                "smi"
            ),
        });

        const treeNode = TreeNode.loadFromFileInfo(myFile);
        treeNode
            .then((node: any) => {
                node.title = "DrawMolecule";
                node.type = TreeNodeType.Compound;

                const rootNode = TreeNode.loadHierarchicallyFromTreeNodes([
                    node,
                ]);

                rootNode.title = "DrawMolecule";
                rootNode.addToMainTree();
                return;
            })
            .catch((err: any) => {
                throw err;
            });
    }

    /**
     * Each plugin is associated with specific jobs (calculations). Most of
     * these will run in the browser itself, rather than on a remote computing
     * resource. This function runs a single job in the browser (or calls the
     * JavaScript/WASM libraries to run the job). The job-queue system calls
     * `runJob` directly.
     *
     * @param {any} args  One of the parameterSets items submitted via the
     *                    `submitJobs` function. Optional.
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    runJobInBrowser(args: any): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Detects when widget is clicked. Enables action button if there is a valid
     * smiles string ready.
     */
    onWidgetClick() {
        alert("hi")
        this.currentSmiles = this.kekule.IO.saveFormatData(
            this.chemComposer.getChemObj(),
            "smi"
        );
        this.isActionBtnEnabled = this.currentSmiles !== "";
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @returns {ITest}  The selenium test command(s).
     */
    getTests(): ITest {
        return {
            afterPluginCloses: new TestCmdList().waitUntilRegex(
                "#navigator",
                "DrawMolecule"
            ),
        };
    }
}
</script>
<style>
.K-Chem-Composer .K-Chem-Editor {
    overflow: hidden !important;
}
</style>
