<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        actionBtnTxt="Rename"
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"
    ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg, IUserArgText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { getDefaultNodeToActOn, setNodesToActOn } from "./EditBarUtils";
import { checkOneMolSelected } from "../../CheckUseAllowedUtils";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";

/**
 * RenameMolPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class RenameMolPlugin extends PluginParentClass {
    menuPath = "[4] Navigator/Molecules/[1] Rename...";
    title = "Rename Molecule";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //   name: "Jacob D. Durrant",
        //   url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "renamemol";
    intro = `Rename the molecule.`;
    tags = [Tag.All];

    userArgDefaults: UserArg[] = [
        {
            id: "newName",
            label: "",
            val: "",
            placeHolder: "Name of new molecule...",
            description: "The new name for this molecule.",
            validateFunc: (newName: string): boolean => {
                return newName.length > 0;
            },
        } as IUserArgText,
    ];

    nodesToActOn = new TreeNodeList([getDefaultNodeToActOn()]);
    
    logJob = false;

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        return checkOneMolSelected();
    }

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     *
     * @param {any} payload  The payload (node id)
     */
    async onBeforePopupOpen(payload: any) {
        setNodesToActOn(this, payload);
        this.setUserArg("newName", this.nodesToActOn.get(0).title);
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @returns {Promise<void>}  Resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        if (this.nodesToActOn) {
            const nodeToActOn = this.nodesToActOn.get(0);
            nodeToActOn.title = this.getUserArg("newName");

            // If there is only one terminal node, update that node's title too.
            if (nodeToActOn.nodes?.terminals.length === 1) {
                nodeToActOn.nodes.terminals.get(0).title = this.getUserArg("newName");
            }
        }
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
                .loadExampleMolecule(true)
                .selectMoleculeInTree("Protein"),
            pluginOpen: new TestCmdList().setUserArg(
                "newName",
                "Protein2",
                this.pluginId
            ),
            afterPluginCloses: new TestCmdList()
                .waitUntilRegex("#navigator", "Protein2")

                // Also check clicking in title bar
                .selectMoleculeInTree("Compounds")
                .click('#navigator div[data-label="Compounds"] span.rename')
                .text("#newName-renamemol-item", "Compounds2")
                .pressPopupButton(".action-btn", this.pluginId)
                .wait(2)
                .waitUntilRegex("#navigator", "Compounds2"),
        };
    }
}
</script>

<style scoped lang="scss"></style>
