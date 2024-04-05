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
import { getDesaltUserArg } from "@/UI/Forms/FormFull/FormFullCommonEntries";
import { dynamicImports } from "@/Core/DynamicImports";

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
            placeHolder: "Name of pasted molecule...",
            description: "The name of the new, pasted molecule.",
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
        getDesaltUserArg(),
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
            // if (txt.indexOf(" ") === -1 && txt.indexOf("\t") === -1) {
            //     txt = txt + " PastedMol";
            // }
        } else if (isTest) {
            // Get value of index from the url
            const url = new URL(window.location.href);
            const index = url.searchParams.get("index");
            const axios = await dynamicImports.axios.module;
            let resp: any;
            if ([null, undefined, "0"].includes(index))
                resp = await axios.get("testmols/example.can");
            else if (index === "1")
                resp = await axios.get("testmols/example.sdf");
            else if (index === "2")
                resp = await axios.get("testmols/example.pdb");
            else if (index === "3")
                resp = await axios.get("testmols/example.mol2");
            else if (index === "4")
                resp = await axios.get("testmols/example_mult.can");
            else if (index === "5")
                resp = await axios.get("testmols/example_mult.sdf");
            else if (index === "6")
                resp = await axios.get("testmols/example_mult.pdb");
            else if (index === "7")
                resp = await axios.get("testmols/example_mult.mol2");
            else if (index === "8")
                resp = { data: "C##moose" };

            txt = resp.data;
        }

        const fileInfo = new FileInfo({
            name: "",
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

        const node = await TreeNode.loadFromFileInfo(
            fileInfo,
            this.getUserArg("desalt"),
            undefined,
            this.getUserArg("pastedMolName")
        );

        if (node === undefined) {
            return;
        }

        node.visible = true;
        node.title = this.getUserArg("pastedMolName");

        node.addToMainTree();
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
     * @returns {ITest[]}  The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        // See paste function where actual molecules are loaded. Just need five tests.
        const test = {
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
        const tests = [test, test, test, test, test, test, test, test];

        // Final test to detect error catching
        tests.push({
            pluginOpen: new TestCmdList().setUserArg(
                "pastedMolName",
                "my_molz",
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

<style scoped lang="scss"></style>
