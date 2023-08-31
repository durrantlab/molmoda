<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
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
import { randomID } from "@/Core/Utils";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    IUserArgOption,
    IUserArgSelect,
    IUserArgTextArea,
    UserArg,
    UserArgType,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { molFormatInformation } from "@/FileSystem/LoadSaveMolModels/Types/MolFormats";

function getFormatInfos() {
    // Keep only those keys whose values have validateContents defined
    // const formats: [string, string, (s: string) => boolean][] = [];
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
    return { options, validateFuncs };
}

function detectFileType(contents: string): string {
    for (const [validateFunc, ext] of getFormatInfos().validateFuncs) {
        if (validateFunc(contents)) {
            return ext;
        }
    }

    // TODO: This really means "unknown" format, not "pdb" format. Should not
    // allow user to click button.
    return "pdb";
}

/**
 * PasteFilePlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class PasteFilePlugin extends PluginParentClass {
    menuPath = "File/Import/[7] Paste...";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Yuri K. Kochnev",
            url: "http://durrantlab.com/",
        },
    ];
    pluginId = "pastefileplugin";

    intro = `Use the editor below to paste your file.`;
    title = "Paste File Component";

    userArgDefaults: UserArg[] = [
        {
            id: "pasteFileTextArea",
            val: "",
            type: UserArgType.TextArea,
            placeHolder: "Paste file contents here...",
        } as IUserArgTextArea,
        {
            // type: UserArgType.MoleculeInputParams,
            label: "Format",
            id: "format",
            options: getFormatInfos().options,
            val: "pdb",
        } as IUserArgSelect,
    ];

    onUserArgChange() {
        const contents = this.getUserArg("pasteFileTextArea");
        // console.log("PasteFilePlugin: onInputTextChange: val: ", contents);
        this.setUserArg("format", detectFileType(contents));
    }

    onPopupDone() {
        // console.log(
        //     "PasteFilePlugin: onPopupDone: this.inputText: " +
        //         detectFileType(this.getUserArg("pasteFileTextArea"))
        // );

        // access userArgs object with id 'pdb' and set the value to true
        // const userArgs = this.userArgs;
        // console.log("PasteFilePlugin: onPopupDone: userArgs: ", userArgs);

        const fileInfo = new FileInfo({
            name: "PastedFile" + randomID() + "." + "smi", // getFileExtension(detectFileType(this.inputText)),
            contents: this.getUserArg("pasteFileTextArea"),
        });

        const treeNode = TreeNode.loadFromFileInfo(fileInfo);
        treeNode
            .then((node: any) => {
                node.title = "Pasted File";
                node.type = TreeNodeType.Compound;

                node.addToMainTree();
                return;
            })
            .catch((err: any) => {
                throw err;
            });
    }

    runJobInBrowser(arg: any): Promise<void> {
        // console.log("PasteFilePlugin: runJobInBrowser: arg: ", arg);
        return Promise.resolve();
    }

    getTests() {
        return [];
    }
}
</script>

<style scoped></style>
