<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onUserArgChanged="onUserArgChanged"
        actionBtnTxt="Paste"
        @onMolCountsChanged="onMolCountsChanged"
    >
        <template #afterForm>
            <div class="mt-3">
                <Alert type="info">{{ formatMsg }}</Alert>
            </div>
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
import { isTest } from "@/Core/GlobalVars";
import { getDesaltUserArg } from "@/UI/Forms/FormFull/FormFullCommonEntries";
import { fetcher } from "@/Core/Fetcher";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import {
    getGen3DUserArg,
    WhichMolsGen3D,
    IGen3DOptions,
} from "@/FileSystem/OpenBabel/OpenBabel";

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
    tags = [Tag.All];
    
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
        getGen3DUserArg(
            "Generate 3D coordinates", 
            "For molecules without 3D coordinates (e.g., SMILES), choose how to generate those coordinates. Otherwise, this parameter is ignored.",
            false
        )
    ];
    
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
    async onBeforePopupOpen(payload: any) {
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
            // let txt: any;
            if ([null, undefined, "0"].includes(index))
                txt = await fetcher("testmols/example.can");
            else if (index === "1") txt = await fetcher("testmols/example.sdf");
            else if (index === "2") txt = await fetcher("testmols/example.pdb");
            else if (index === "3")
                txt = await fetcher("testmols/example.mol2");
            else if (index === "4")
                txt = await fetcher("testmols/example_mult.can");
            else if (index === "5")
                txt = await fetcher("testmols/example_mult.sdf");
            else if (index === "6")
                txt = await fetcher("testmols/example_mult.pdb");
            else if (index === "7")
                txt = await fetcher("testmols/example_mult.mol2");
            else if (index === "8") txt = "C##moose";
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
    
        const gen3DParams = {
            whichMols: WhichMolsGen3D.OnlyIfLacks3D,
            level: this.getUserArg("gen3D"),
        } as IGen3DOptions;

        const node = await TreeNode.loadFromFileInfo({
            fileInfo,
            tag: this.pluginId,
            desalt: this.getUserArg("desalt"),
            defaultTitle: this.getUserArg("pastedMolName"),
   gen3D: gen3DParams,
        });

        if (node === undefined) {
            return;
        }
        node.title = this.getUserArg("pastedMolName");

        node.addToMainTree(this.pluginId);
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
