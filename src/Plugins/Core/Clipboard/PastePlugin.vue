<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onUserArgChanged="onUserArgChanged"
        actionBtnTxt="Paste"
    >
        <template #afterForm>
            <Alert class="mt-3" type="info">{{ formatMsg }}</Alert>
        </template>
    </PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options } from "vue-class-component";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { IUserArgText, UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { appName } from "@/Core/GlobalVars";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import Alert from "@/UI/Layout/Alert.vue";
import { molFormatInformation } from "@/FileSystem/LoadSaveMolModels/Types/MolFormats";
import * as api from "@/Api";
import { isTest } from "@/Testing/SetupTests";

/** PastePlugin */
@Options({
    components: {
        PluginComponent,
        Alert,
    },
})
export default class PastePlugin extends PluginParentClass {
    menuPath = ["Edit", "Clipboard", "Paste"];
    title = "Paste from Clipboard";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "pasteclipboard";
    // noPopup = true;
    userArgDefaults: UserArg[] = [
        {
            id: "pastedMolName",
            label: "",
            val: "PastedMol",
            placeHolder: "Pasted molecule name",
            description: "The name of the new, pasted molecule.",
        } as IUserArgText,
    ];
    alwaysEnabled = true;
    logJob = false;
    intro = "Paste a molecule from the clipboard.";
    formatMsg = "";

    hotkey = "v";

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     * 
     * @param {any} payload  The payload (node id)
     */
     onBeforePopupOpen(payload: any) {
        let formatMsg = `${appName} recognizes text pasted in any of the following formats: `;

        for (const formatID in molFormatInformation) {
            const format = molFormatInformation[formatID];
            if (format.validateContents === undefined) {
                continue;
            }
            formatMsg += `${format.description} (${format.exts
                .map((e) => "." + e)
                .join(" ")}), `;
        }
        this.formatMsg = formatMsg.slice(0, -2) + ".";
    }


    /**
     * Pastes the molecule from the clipboard.
     */
    async paste(): Promise<void> {
        let txt = "";
        if (navigator.clipboard && !isTest) {
            txt = await navigator.clipboard.readText();
        } else if (isTest) {
            txt = "c1ccccc1";
        }

        const fileInfo = new FileInfo({
            name: "pastedFile",
            contents: txt,
        });

        const guessedFormat = fileInfo.guessFormat();
        if (guessedFormat === undefined) {
            api.messages.popupError(
                "<p>Could not find valid molecules. Are you certain your pasted text is in one of the recognized formats?</p>"
            );
            return;
        }

        fileInfo.assignExtByContents();

        const node = await TreeNode.loadFromFileInfo(fileInfo);

        if (node === undefined) {
            return;
        }

        node.visible = true;
        node.title = this.getUserArg("pastedMolName");

        node.addToMainTree();

        // debugger;
        // node.title = "PastedFile";

        // const rootNode = TreeNode.loadHierarchicallyFromTreeNodes([
        //     node,
        // ]);

        // // rootNode.title = "PastedFile";
        // rootNode.addToMainTree();

        // const format = fileInfo.guessFormat();
        // debugger;
    }

    /**
     * Runs after the popup opens. Good for setting focus in text elements.
     */
     onPopupOpen() {
        // Add click event listener to button with selection sel. Doing this
        // because it must happen immediately.
        document
            .querySelector(`#modal-${this.pluginId} .action-btn`)
            ?.addEventListener("click", (e) => {
                this.paste();
                e.target?.removeEventListener("click", () => {
                    return;
                });
            });

        // Similarly, as soon as enter pressed, paste. (Can't use existing
        // system because it must happen immediately.
        document
            .querySelector(`#modal-${this.pluginId}`)
            ?.addEventListener("keydown", (e: any) => {
                if (e.key === "Enter") {
                    this.paste();
                    e.currentTarget.removeEventListener("keydown", () => {
                        return;
                    });
                }
            });
    }

    /**
     * Runs when the popup closes via done button. Here, does nothing.
     */
     onPopupDone() {
        this.submitJobs([]);
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     */
    async runJobInBrowser(): Promise<void> {
        return Promise.resolve();
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
            pluginOpen: new TestCmdList().setUserArg(
                "pastedMolName",
                "my_molz",
                this.pluginId
            ),
            afterPluginCloses: new TestCmdList().waitUntilRegex(
                "#navigator",
                "my_molz"
            ),
        };
    }
}
</script>

<style scoped lang="scss"></style>
