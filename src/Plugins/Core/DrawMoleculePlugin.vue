<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged"
        @onPopupDone="onPopupDone" modalWidth="xl" :isActionBtnEnabled="isActionBtnEnabled"
        @onMolCountsChanged="onMolCountsChanged">
        <template #afterForm>
            <div ref="chemComposer" style="width: 100%; height: 400px" class="mt-4"></div>
            <!-- @click="onWidgetUpdated" -->
            <!-- @keyup="onWidgetUpdated" -->
            <!-- v-model="molName"
        @onChange="searchByName"
        :description="molNameRespDescription" -->
            <FormWrapper v-if="testEditing" class="mt-2" id="draw-smiles-wrapper">
                <FormInput v-model="currentSmiles" placeHolder="SMILES..." id="draw-smiles"
                    :delayBetweenChangesDetected="500" :validateDescription="false" @onChange="onUpdateSMILES">
                    <!-- actionBtnTxt="Update" -->
                    <!-- @onActionBtnClick="onUpdateBtnClick" -->
                </FormInput>
            </FormWrapper>
            <!-- {{ currentSmiles }} -->
        </template>
    </PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { Options } from "vue-class-component";

import { FileInfo } from "@/FileSystem/FileInfo";
import { IUserArgText, UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import {
    ISoftwareCredit,
    IContributorCredit,
} from "@/Plugins/PluginInterfaces";
import { dynamicImports } from "@/Core/DynamicImports";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import FormInput from "@/UI/Forms/FormInput.vue";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import { convertFileInfosOpenBabel } from "@/FileSystem/OpenBabel/OpenBabel";
import { randomID } from "@/Core/Utils/MiscUtils";
import { Tag } from "./ActivityFocus/ActivityFocusUtils";
import { isTest } from "@/Core/GlobalVars";

// See
// https://partridgejiang.github.io/Kekule.js/documents/tutorial/content/composer.html
// https://partridgejiang.github.io/Kekule.js/documents/index.html

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
            // url: "http://durrantlab.com/",
        },
    ];
    pluginId = "drawmoleculeplugin";
    title = "Draw Molecule";
    intro = `Use a molecular editor to draw or edit a small-molecule compound.`;
    details =
        "This plugin also allows direct editing of the SMILES string via a text field under the editor.";
    tags = [Tag.All];

    userArgDefaults: UserArg[] = [
        {
            id: "drawMolName",
            label: "",
            val: "DrawMolecule",
            placeHolder: "Name of the new molecule...",
            description: "The name of the new molecule.",
            validateFunc: (val: string) => {
                return val.length > 0;
            },
            warningFunc: (val: string) => {
                if (val === "DrawMolecule") {
                    return "Consider choosing a unique name so you can easily identify your molecule later.";
                }
                return "";
            },
        } as IUserArgText,
    ];
    currentSmiles = "";

    kekule: any;
    chemComposer: any;

    isActionBtnEnabled = false;

    // Toggle below to test editing. Once implementation complete, may remove
    // toggle implementation.
    testEditing = true;

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     *
     * @param {any} payload  The payload (if editing existing molecule)
     */
    async onBeforePopupOpen(payload: any) {
        this.currentSmiles = "";

        if (payload) {
            this.title = "Edit Molecule";
            this.currentSmiles = payload.smiles;
            this.setUserArg("drawMolName", payload.name);
        } else {
            this.title = "Draw Molecule";
        }
    }

    /**
     * Runs when the popup opens. Good for loading external libraries.
     */
    onPopupOpen() {
        dynamicImports.kekule.module
            .then((module: any) => {
                // this.kekule = module.Kekule;
                this.kekule = module;
                const chemComposerRef = this.$refs["chemComposer"];
                this.chemComposer = new this.kekule.Editor.Composer(
                    chemComposerRef
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

                this.chemComposer
                    .getEditor()
                    .on("editObjsUpdated", (/* e: any */) => {
                        let mol =
                            this.kekule.ChemStructureUtils.getTotalStructFragment(
                                this.chemComposer.getChemObj()
                            );
                        if (mol) {
                            this.onWidgetUpdated();
                        }
                    });

                // this.chemComposer
                //     .getRenderConfigs()
                //     .getMoleculeDisplayConfigs()
                //     .setDefHydrogenDisplayLevel(
                //         this.kekule.Render.HydrogenDisplayLevel.NONE
                //     );

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

                if (this.currentSmiles !== "") {
                    this.onUpdateSMILES();
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
        // TODO: Below would be nice. Good to use molmoda's openbabel instead of
        // loading kekule's openbabel.

        // Convert smi to sdf
        const fileInfo = new FileInfo({
            name: randomID() + ".smi",
            contents: smi,
        });

        let mol2Txts: string[] = [];
        mol2Txts = await convertFileInfosOpenBabel(
            [fileInfo],
            "mol2",
            undefined,
            null,
            undefined,
            true
        );
        if (mol2Txts.length === 0) {
            // throw new Error("Failed to convert SMILES to MOL2.");
            return;
        }
        const mol2Txt = mol2Txts[0];

        // const contents = await convertFileInfosOpenBabel([fileInfo], "cml");
        // const testMol = this.kekule.IO.loadFormatData(contents[0], "sdf");

        // setChemObjData does not preserve chirality

        // Indigo does not do chirality
        // this.kekule.Indigo.enable((error: any) => {
        //     if (!error) {
        //         const payload = {
        //             format: "smi",
        //             data: smi,
        //         };
        //         this.chemComposer
        //             .getEditor()
        //             .setChemObjData(JSON.stringify(payload));
        //         // .setChemObjData('{"format": "smi", "data": "' + smi + '"}');
        //     }
        // });

        this.kekule.OpenBabel.enable((error: any) => {
            if (!error) {
                // console.log(mol2Txt);
                // const payload = {
                //     "format": "mol2",
                //     "data": mol2Txt,
                // }
                // this.chemComposer
                //     .getEditor()
                //     .setChemObjData(JSON.stringify(payload));

                const mol = this.kekule.IO.loadFormatData(mol2Txt, "mol2");
                // const mol = this.kekule.IO.loadFormatData(smi, "smi");

                // the molecule loaded from SMILES by OpenBabel has no
                // coordinates for atoms, and you can generate them manually
                const generator =
                    new this.kekule.Calculator.ObStructure2DGenerator();
                generator.setSourceMol(mol);
                generator.executeSync(() => {
                    const newMol = generator.getGeneratedMol();
                    // this.chemComposer
                    //     .getRenderConfigs()
                    //     .getMoleculeDisplayConfigs()
                    //     .setDefHydrogenDisplayLevel(
                    //         this.kekule.Render.HydrogenDisplayLevel.NONE
                    //     );
                    this.chemComposer.setChemObj(newMol);
                    this.chemComposer.getEditor().scrollClientToObject(newMol);

                    // See https://github.com/partridgejiang/Kekule.js/issues/305
                    // composer.getEditor().zoomTo(0.75);
                    // composer.getEditor().setInitialZoom(1);
                });
            }
        });

        return;
    }

    /**
     * Runs when the user presses the action button.
     */
    onUpdateSMILES() {
        // Seems too challenging to load SMI file into kekule. Going to use
        // OpenBabel to convert to cml

        this.loadFromSmiles(this.currentSmiles);
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

        const treeNode = TreeNode.loadFromFileInfo({
            fileInfo: myFile,
            tag: this.pluginId,
        });
        treeNode
            .then((node: any) => {
                node.title = this.getUserArg("drawMolName");
                node.type = TreeNodeType.Compound;

                const rootNode = TreeNode.loadHierarchicallyFromTreeNodes([
                    node,
                ]);

                rootNode.title = this.getUserArg("drawMolName");
                rootNode.addToMainTree(this.pluginId);
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
    onWidgetUpdated() {
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
    async getTests(): Promise<ITest> {
        return {
            name: "Drawing a Molecule Tour",
            pluginOpen: () =>
                new TestCmdList()
                    .tourNote(
                        "This is the molecular editor. For this tour, we have pre-drawn methane for you.",
                        `[ref="chemComposer"]`
                    )
                    .setUserArg("drawMolName", "Methane", this.pluginId)
                    .tourNote(
                        "You can name your new molecule here.",
                        `#drawMolName-${this.pluginId}-item`
                    ),
            afterPluginCloses: () =>
                new TestCmdList().waitUntilRegex("#navigator", "Methane"),
        };
    }
}
</script>
<style>
.K-Chem-Composer .K-Chem-Editor {
    overflow: hidden !important;
}
</style>
