<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged" actionBtnTxt="Copy"
        @onMolCountsChanged="onMolCountsChanged">
        <Alert type="info">{{ formatMsg }}</Alert>
        <Alert type="warning">
            To save your molecules in other formats, consider
            <PluginPathLink plugin="savemolecules"></PluginPathLink> If you wish
            only to duplicate molecules ("copy and paste"), consider
            <PluginPathLink plugin="clonemol"></PluginPathLink>
        </Alert>
    </PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options } from "vue-class-component";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import {
    SelectedType,
    TreeNodeType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { checkAnyMolSelected } from "../../CheckUseAllowedUtils";
import { TestCmdList } from "@/Testing/TestCmdList";
import Alert from "@/UI/Layout/Alert.vue";
import PluginPathLink from "@/UI/Navigation/PluginPathLink.vue";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";

/** CopyPlugin */
@Options({
    components: {
        PluginComponent,
        Alert,
        PluginPathLink,
    },
})
export default class CopyPlugin extends PluginParentClass {
    menuPath = ["Edit", "Clipboard", "Copy"];
    title = "Copy to Clipboard";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "copyclipboard";
    tags = [Tag.All];

    // noPopup = true;
    userArgDefaults: UserArg[] = [
        // {
        //     id: "descript",
        //     type: UserArgType.Alert,
        //     val: "Your molecules will be copied as...",
        //     alertType: "info",
        // } as IUserArgAlert,
        // {
        //     id: "descript",
        //     type: UserArgType.Alert,
        //     val: "If you wish to save your molecules to a different format, consider ",
        //     alertType: "warning",
        // } as IUserArgAlert,
    ];

    logJob = false;
    intro = "Copy the selected molecules to the clipboard.";
    formatMsg = "";

    hotkey = "c";

    nonCompounds: TreeNodeList | undefined;
    compounds: TreeNodeList | undefined;

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        return checkAnyMolSelected();
    }

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     *
     * @param {any} payload  The payload (node id)
     */
    async onBeforePopupOpen(payload: any) {
        this.formatMsg = "Your molecules will be copied as...";
    }

    /**
     * Copies the molecules to the clipboard.
     */
    async copy(): Promise<void> {
        if (this.nonCompounds === undefined || this.compounds === undefined) {
            // This will never happen, but just to make typescript happy.
            return;
        }

        // Everything that isn't a compound goes into 1 pdb file.
        let pdbTxt = "";
        if (this.nonCompounds.length > 0) {
            const fileInfos = await this.nonCompounds.toFileInfos("pdb", true);
            if (fileInfos.length > 0) {
                pdbTxt = fileInfos[0].contents;
            }
        }

        // Everything that is a compound goes into mol2 files.
        let mol2Txt = "";
        if (this.compounds.length > 0) {
            const fileInfos = await this.compounds.toFileInfos("mol2", false);
            if (fileInfos.length > 0) {
                mol2Txt = fileInfos.map((f) => f.contents).join("\n");
            }
        }

        if (pdbTxt !== "" && mol2Txt !== "") {
            // This should never happen
            throw new Error("Both pdbTxt and mol2Txt are not empty.");
        }

        const txtToCopy = pdbTxt + mol2Txt;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(txtToCopy);
        }
    }

    /**
     * Runs after the popup opens. Good for setting focus in text elements.
     */
    onPopupOpen() {
        // Copying terminal nodes only. So copying and pasting will not preserve
        // the hierarchy.
        const terminals = (this.$store.state["molecules"] as TreeNodeList)
            .terminals;
        const selectedNodes = terminals.filter(
            (n) => n.selected !== SelectedType.False
        );

        // Separate out compounds and non compounds
        this.nonCompounds = selectedNodes.filter(
            (n) => n.type !== TreeNodeType.Compound
        );
        this.compounds = selectedNodes.filter(
            (n) => n.type === TreeNodeType.Compound
        );

        if (this.nonCompounds.length > 0 && this.compounds.length > 0) {
            this.formatMsg =
                "Your molecules will be copied as PDB text because you have selected both compounds and non-compounds.";
        } else if (this.nonCompounds.length > 0) {
            this.formatMsg =
                "Your molecules will be copied as PDB text because you have selected only non-compounds (e.g., proteins).";
        } else if (this.compounds.length > 0) {
            this.formatMsg =
                "Your molecules will be copied as MOL2 text because you have selected only compounds.";
        } else {
            // Should never happen
            throw new Error("No compounds or non-compounds selected.");
        }

        // If there are any elements in in nonCompounds, put everything in
        // nonCompounds. So even compounds will be included in the single PDB
        // file.
        if (this.nonCompounds.length > 0) {
            this.compounds.forEach((n) => {
                this.nonCompounds?.push(n);
            });
            this.compounds = new TreeNodeList([]);
        }

        // Add click event listener to button with selection sel. Doing this
        // because it must happen immediately.
        document
            .querySelector(`#modal-${this.pluginId} .action-btn`)
            ?.addEventListener("click", () => {
                this.copy();
                document
                    .querySelector(`#modal-${this.pluginId} .action-btn`)
                    ?.removeEventListener("click", () => {
                        return;
                    });
            });

        // Similarly for "enter" key. (Can't use existing system because it
        // must happen immediately).
        document.addEventListener("keydown", (e: any) => {
            if (e.key === "Enter") {
                this.copy();
                document.removeEventListener("keydown", () => {
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
    async getTests(): Promise<ITest> {
        return {
            beforePluginOpens: new TestCmdList()
                .loadExampleMolecule()
                .selectMoleculeInTree("Protein"),
            closePlugin: new TestCmdList().pressPopupButton(
                ".action-btn",
                this.pluginId
            ),
            afterPluginCloses: new TestCmdList(),
        };
    }
}
</script>

<style scoped lang="scss"></style>
