<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        :isActionBtnEnabled="isActionBtnEnabled"
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
        :submitOnEnter="false"
        @onMolCountsChanged="onMolCountsChanged"
    >
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
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { getDesaltUserArg } from "@/UI/Forms/FormFull/FormFullCommonEntries";
import { fetcher } from "@/Core/Fetcher";
import { randomID } from "@/Core/Utils/MiscUtils";
import { Tag } from "./ActivityFocus/ActivityFocusUtils";
import { getGen3DUserArg, WhichMolsGen3D, IGen3DOptions } from "@/FileSystem/OpenBabel/OpenBabel";

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

    /**
     * Called when the user arguments change. Override this function to react
     * when the user arguments change. Access the arguments using this.userArgs.
     */
    onUserArgChange() {
        const contents = this.getUserArg("molTextArea");
        const ext = detectFileType(contents);
        if (ext !== "unknown") {
            this.setUserArg("format", ext);
            this.isActionBtnEnabled = true;
        } else {
            this.isActionBtnEnabled = false;
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

                const rootNode = TreeNode.loadHierarchicallyFromTreeNodes([
                    node,
                ]);

                rootNode.title = this.getUserArg("pastedMolName"); // "PastedFile";
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
     * Gets the test commands for the plugin. For advanced use.
     *
     * @returns {ITest[]}  The selenium test command(s).
     */
    async getTests(): Promise<ITest[]> {
        const promises = [
            fetcher("testmols/example.can"),
            fetcher("testmols/example.sdf"),
            fetcher("testmols/example.pdb"),
            fetcher("testmols/example.mol2"),
            fetcher("testmols/example_mult.can"),
            fetcher("testmols/example_mult.sdf"),
            fetcher("testmols/example_mult.pdb"),
            fetcher("testmols/example_mult.mol2"),
        ];

        const txts = await Promise.all(promises);

        const tests = txts.map((txt: string) => {
            return {
                pluginOpen: new TestCmdList().setUserArg(
                    "molTextArea",
                    txt,
                    this.pluginId
                ),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "PastedMol"
                ),
            };
        });

        // Final test to verify error catching
        tests.push({
            pluginOpen: new TestCmdList().setUserArg(
                "molTextArea",
                "C##moose",
                this.pluginId
            ),
            afterPluginCloses: new TestCmdList().waitUntilRegex(
                "#modal-simplemsg",
                "File contained no valid"
            ),
        });

        return tests;
    }
}
</script>

<style scoped></style>
