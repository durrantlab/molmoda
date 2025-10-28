<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" :isActionBtnEnabled="isActionBtnEnabled"
        @onPopupDone="onPopupDone" @onUserArgChanged="onUserArgChanged" :submitOnEnter="false"
        @onMolCountsChanged="onMolCountsChanged">
        <template #afterForm>
            <div :class="smilesImgValid ? '' : 'hide-smiles-vis'">
                <div v-if="getUserArg('format') === 'smi' && currentSmilesForPreview.trim() !== ''"
                    class="mt-3 border p-2 text-center" style="max-height: 300px; overflow-y: auto;">
                    <Mol2DView @onValidImageDetect="onValidImageDetect" :smiles="currentSmilesForPreview"
                        :maxHeight="280" :minHeight="50" :showDownloadButtons="true" />
                </div>
            </div>
        </template>
    </PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { Options } from "vue-class-component";
import { FileInfo } from "@/FileSystem/FileInfo";
import {
    ISoftwareCredit,
    IContributorCredit,
} from "@/Plugins/PluginInterfaces";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    IUserArgOption,
    IUserArgSelect,
    IUserArgText,
    IUserArgTextArea,
    UserArg,
    UserArgType,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { molFormatInformation } from "@/FileSystem/LoadSaveMolModels/Types/MolFormats";
import { ITest } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { getDesaltUserArg } from "@/UI/Forms/FormFull/FormFullCommonEntries";
import { fetcher } from "@/Core/Fetcher";
import { randomID } from "@/Core/Utils/MiscUtils";
import { Tag } from "./ActivityFocus/ActivityFocusUtils";
import { getGen3DUserArg, WhichMolsGen3D, IGen3DOptions } from "@/FileSystem/OpenBabel/OpenBabel";
import Mol2DView from "@/UI/Components/Mol2DView.vue"; // Import the new component
import { loadHierarchicallyFromTreeNodes } from "@/UI/Navigation/TreeView/TreeUtils";
/**
 * A function that returns the options and validate functions for the available
 * molecular formats.
 *
 * @returns {any}  An object with two keys: options and validateFuncs
 */
function getFormatInfos(): { [key: string]: any[] } {
    // NOTE: There's some overlap here and with the FileInfo.guessFormat()
    // function, but here formats things a little differently, accounts for
    // unknown, etc. I'm going to leave for now, but be aware of the potential
    // redundancy.

    // Keep only those keys whose values have validateContents defined
    const options: IUserArgOption[] = [];
    const validateFuncs: [(s: string) => boolean, string][] = [];
    Object.keys(molFormatInformation).forEach((key) => {
        const format = molFormatInformation[key];
        if (format.validateContents !== undefined) {
            options.push({
                description: `${format.description} (*.${format.primaryExt})`,
                val: format.primaryExt,
            });
            validateFuncs.push([format.validateContents, format.primaryExt]);
        }
    });

    // Account for undefined
    options.push({
        description: "Unknown format",
        val: "unknown",
    });

    // Make sure SMI is the last validate function. It's the most permissive.
    const smiIndex = validateFuncs.findIndex((x) => x[1] === "smi");
    const smi = validateFuncs.splice(smiIndex, 1)[0];
    validateFuncs.push(smi);

    return { options, validateFuncs };
}

/**
 * Detects the file type from the contents of the file.
 *
 * @param {string} contents  The contents of the file.
 * @returns {string}  The file extension.
 */
function detectFileType(contents: string): string {
    contents = contents.trim();
    for (const [validateFunc, ext] of getFormatInfos().validateFuncs) {
        if (validateFunc(contents)) {
            return ext;
        }
    }

    return "unknown";
}

/**
 * MolTextPlugin
 */
@Options({
    components: {
        PluginComponent,
        Mol2DView, // Register the new component
    },
})
export default class MolTextPlugin extends PluginParentClass {
    menuPath = "File/Import/[7] Molecular Text...";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Yuri K. Kochnev",
            // url: "http://durrantlab.com/",
        },
    ];
    pluginId = "moltextplugin";
    intro = `Type or paste molecular text.`;
    title = "Molecular Text";
    tags = [Tag.All];

    isActionBtnEnabled = false;
    currentSmilesForPreview = ""; // Only store the SMILES string for Mol2DView

    userArgDefaults: UserArg[] = [
        {
            id: "pastedMolName",
            label: "",
            val: "PastedMol",
            placeHolder: "Name of the new molecule...",
            description: "The name of the new molecule.",
            validateFunc: (val: string) => {
                return val.length > 0;
            },
            warningFunc: (val: string) => {
                if (val === "PastedMol") {
                    return "Consider choosing a unique name so you can easily identify your molecule later.";
                }
                return "";
            },
        } as IUserArgText,
        {
            id: "molTextArea",
            val: "",
            type: UserArgType.TextArea,
            placeHolder: "Molecular text...",
            description:
                "The contents of the molecule file. Type or paste the text here.",
            validateFunc: (val: string) => {
                return val.length > 0;
            },
        } as IUserArgTextArea,
        {
            label: "Format",
            id: "format",
            options: getFormatInfos().options,
            val: "unknown",
        } as IUserArgSelect,
        getDesaltUserArg(),
        getGen3DUserArg(
            "Generate 3D coordinates",
            "For molecules without 3D coordinates (e.g., SMILES), choose how to generate those coordinates. Otherwise, this parameter is ignored.",
            false
        ),
    ];

    smilesImgValid = false;

    /**
     * Called when the Mol2DView component detects whether the SMILES is valid.
     * This is used to enable/disable the action button.
     *
     * @param {boolean} isValid  Whether the SMILES is valid.
     */
    onValidImageDetect(isValid: boolean) {
        this.smilesImgValid = isValid;
    }

    /**
     * Called when the user arguments change. Override this function to react
     * when the user arguments change. Access the arguments using this.userArgs.
     */
    async onUserArgChange() {
        const contents = this.getUserArg("molTextArea") as string;
        const detectedExt = detectFileType(contents);
        const currentFormat = this.getUserArg("format") as string;

        if (detectedExt !== "unknown") {
            if (currentFormat === "unknown" || currentFormat !== detectedExt) {
                this.setUserArg("format", detectedExt);
            }
            this.isActionBtnEnabled = true;
        } else {
            // If format is unknown but user has selected a format, still enable.
            this.isActionBtnEnabled = currentFormat !== "unknown" && contents.trim() !== "";
        }

        // Update SMILES string for preview if format is SMILES
        // Mol2DView will handle the actual rendering and error display if SMILES is invalid
        if (this.getUserArg("format") === "smi" && contents.trim() !== "") {
            this.currentSmilesForPreview = contents.trim();
        } else {
            this.currentSmilesForPreview = "";
        }
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
        const fileInfo = new FileInfo({
            name: "PastedFile" + randomID() + "." + this.getUserArg("format"),
            contents: this.getUserArg("molTextArea"),
        });

        const gen3DParams = {
            whichMols: WhichMolsGen3D.OnlyIfLacks3D,
            level: this.getUserArg("gen3D"),
        } as IGen3DOptions;

        const treeNodePromise = TreeNode.loadFromFileInfo({
            fileInfo,
            tag: this.pluginId,
            desalt: this.getUserArg("desalt"),
            gen3D: gen3DParams
        });

        if (treeNodePromise === undefined) {
            throw new Error("Could not load file.");
        }

        treeNodePromise
            .then((node: any) => {
                if (node === undefined) {
                    // Happens with invalid molecule. Error should be detected
                    // elsewhere. To trigger (example), use "C##moose"
                    return;
                }

                node.title = this.getUserArg("pastedMolName"); // "PastedFile";
                node.type = TreeNodeType.Compound;
                const rootNode = loadHierarchicallyFromTreeNodes(
                    [node],
                    this.getUserArg("pastedMolName")
                );
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
     *     Return void if there's nothing to return.
     */
    runJobInBrowser(args: any): Promise<void> {
        // console.log("MolTextPlugin: runJobInBrowser: arg: ", arg);
        return Promise.resolve();
    }

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     *
     * @param {any} payload  The payload (if any)
     */
    async onBeforePopupOpen(payload?: any) {
        this.currentSmilesForPreview = ""; // Reset preview on open
    }


    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @returns {ITest[]}  The selenium test command(s).
     */
    async getTests(): Promise<ITest[]> {
        const urls = [
            "testmols/example.can",
            "testmols/example.sdf",
            "testmols/example.pdb",
            "testmols/example.mol2",
            "testmols/example_mult.can",
            "testmols/example_mult.sdf",
            "testmols/example_mult.pdb",
            "testmols/example_mult.mol2",
        ];
        const promises = urls.map((url) => fetcher(url));
        const txts = await Promise.all(promises);
        const tests = txts.map((txt: string) => {
            const fileInfo = new FileInfo({
                name: "tmp.smi",
                contents: txt,
            });
            const guessedFormat = fileInfo.guessFormat();
            const pluginOpenCmds = new TestCmdList().setUserArg(
                "molTextArea",
                txt,
                this.pluginId
            );
            if (
                guessedFormat &&
                (guessedFormat.primaryExt === "smi" ||
                    guessedFormat.primaryExt === "can")
            ) {
                pluginOpenCmds
                    .wait(2) // wait for rdkit to render
                    .waitUntilRegex("#modal-moltextplugin .svg-wrapper", "<svg");
            }
            return {
                pluginOpen: () => pluginOpenCmds,
                afterPluginCloses: () =>
                    new TestCmdList().waitUntilRegex("#navigator", "PastedMol"),
            };
        });
        // Final test to verify error catching
        tests.push({
            pluginOpen: () =>
                new TestCmdList().setUserArg("molTextArea", "C##moose", this.pluginId),
            afterPluginCloses: () =>
                new TestCmdList().waitUntilRegex(
                    "#modal-simplemsg",
                    "Could not process"
                ),
        });
        return tests;
    }
}
</script>

<style scoped>
.hide-smiles-vis {
    opacity: 0;
    height: 0;
    overflow: hidden;
}
</style>
