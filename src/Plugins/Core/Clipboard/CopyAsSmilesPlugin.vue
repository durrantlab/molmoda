<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onUserArgChanged="onUserArgChanged"
        actionBtnTxt="Copy as SMILES"
        @onMolCountsChanged="onMolCountsChanged"
    >
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
import { checkAnyCompoundSelected, checkAnyMolSelected } from "../../CheckUseAllowedUtils";
import { TestCmdList } from "@/Testing/TestCmdList";
import Alert from "@/UI/Layout/Alert.vue";
import PluginPathLink from "@/UI/Navigation/PluginPathLink.vue";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";

/** CopyPlugin */
@Options({
    components: {
        PluginComponent,
        Alert,
        PluginPathLink,
    },
})
export default class CopyAsSmilesPlugin extends PluginParentClass {
    menuPath = ["Edit", "Clipboard", "Copy as SMILES"];
    title = "Copy SMILES to Clipboard";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "copyassmiles";
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
    intro = "Copy the selected compound(s) to the clipboard as SMILES strings.";

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        return checkAnyCompoundSelected();
    }

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     *
     * @param {any} payload  The payload (node id)
     */
    // async onBeforePopupOpen(payload: any) {}

    /**
     * Copies the molecules to the clipboard.
     */
    async copy(): Promise<void> {
        const treeNodeList = getMoleculesFromStore();
        const compounds = treeNodeList.terminals.filters.keepType(TreeNodeType.Compound);
        const selectedCompounds = compounds.filters.keepSelected(true);

        // Everything that is a compound goes into smiles files.
        let smiTxts: string[] = [];
        const fileInfos = await selectedCompounds.toFileInfos("can", false);
        if (fileInfos.length > 0) {
            smiTxts = fileInfos.map((f) => f.contents.split("\t")[0]);
        }

        const molNames = selectedCompounds.map((n) => n.descriptions.pathName(">", 150));

        let toCopyTxt = "";
        for (let i = 0; i < smiTxts.length; i++) {
            toCopyTxt += `${smiTxts[i]}\t${molNames[i]}\n`;
        }

        if (navigator.clipboard) {
            navigator.clipboard.writeText(toCopyTxt);
        }
    }

    /**
     * Runs after the popup opens. Good for setting focus in text elements.
     */
    onPopupOpen() {
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
                .selectMoleculeInTree("Compounds"),
            afterPluginCloses: new TestCmdList(),
        };
    }
}
</script>

<style scoped lang="scss"></style>
