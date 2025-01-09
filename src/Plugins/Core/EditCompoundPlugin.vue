<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"
    ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import { pluginsApi } from "@/Api/Plugins";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { Tag } from "../Tags/Tags";

/**
 * EditCompoundPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class EditCompoundPlugin extends PluginParentClass {
    // @Prop({ required: true }) softwareCreditsToShow!: ISoftwareCredit[];
    // @Prop({ required: true }) contributorCreditsToShow!: IContributorCredit[];

    menuPath = ["Compounds", "[2] Build", "[5] Edit..."];
    title = "";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "editcompound";
    noPopup = true;
    userArgDefaults: UserArg[] = [];
    
    logJob = false;
    // hotkey = "z";
    intro = "Edit a compound.";
    tags = [Tag.All];

    selected: TreeNode | undefined = undefined;

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        const selecteds =
            getMoleculesFromStore().terminals.filters.keepSelected();

        if (selecteds.length !== 1) {
            return "First select one (and only one) compound by clicking on its name in the Navigator panel.";
        }

        // Get the one selected molecule
        this.selected = selecteds.get(0);

        if (this.selected.type !== TreeNodeType.Compound) {
            return "First select a compound by clicking on its name in the Navigator panel.";
        }

        return null;
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @returns {Promise<void>}  Resolves when the job is done.
     */
    async runJobInBrowser(): Promise<void> {
        if (this.selected === undefined) {
            return Promise.resolve();
        }
        const name = this.selected.title;
        const smilesFileInfo = await this.selected.toFileInfo(".can");
        let smiles = smilesFileInfo.contents;

        // Keep only the part before any whitespace (use regex)
        smiles = smiles.split(/\s.*/)[0];

        pluginsApi.runPlugin("drawmoleculeplugin", {
            smiles: smiles,
            name: name + ":edited",
        });
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
        return [
            {
                beforePluginOpens: new TestCmdList()
                    .loadExampleMolecule(true)
                    .selectMoleculeInTree("Compounds"),
                pluginOpen: new TestCmdList().wait(2).text("#draw-smiles", "OOOO"),
                closePlugin: new TestCmdList().click("#modal-drawmoleculeplugin .action-btn"),
                afterPluginCloses: new TestCmdList()
                    .waitUntilRegex("#navigator", "TOU:101:edited")
            },
        ];
    }
}
</script>

<style scoped lang="scss"></style>
