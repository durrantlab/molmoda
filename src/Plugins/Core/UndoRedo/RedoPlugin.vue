<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import { redo } from "./UndoStack";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";

/**
 * RedoPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class RedoPlugin extends PluginParentClass {
    // @Prop({ required: true }) softwareCreditsToShow!: ISoftwareCredit[];
    // @Prop({ required: true }) contributorCreditsToShow!: IContributorCredit[];

    menuPath = ["Edit", "Revisions", "[2] Redo"];
    title = "Redo";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //   name: "Jacob D. Durrant",
        //   url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "redo";
    noPopup = true;
    userArgDefaults: UserArg[] = [];

    logJob = false;
    logAnalytics = false;

    hotkey = "y";
    intro = "Redo the last undo.";
    details = "This plugin re-applies the last action that was reversed using the Undo command.";
    tags = [Tag.All];

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        if (this.$store.state.redoStack.length === 0) {
            return "No additional redo is available.";
        }
        return null;
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     * 
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        redo(this.$store);
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
        // Not testable?
        // Pick up here: https://aistudio.google.com/u/2/prompts/1dWZ_9cjVnWX6CU1KDOAS0g1VPSBo8uns
        // return {
        //     beforePluginOpens: () => new TestCmdList()
        //         .loadExampleMolecule()
        //         .click("#menu1-edit")
        //         .click("#menu-plugin-undo")
        //         .wait(3),
        //     // afterPluginCloses: () => new TestCmdList().wait(3),
        // };
        return {
            beforePluginOpens: () =>
                new TestCmdList()
                    .loadExampleMolecule(true)
                    .selectMoleculeInTree("Protein")
                    .openPlugin("deletemol")
                    .pressPopupButton(".action-btn", "deletemol")
                    .waitUntilNotRegex("#navigator", "Protein")
                    .openPlugin("undo") // run undo
                    .waitUntilRegex("#navigator", "Protein"),
            afterPluginCloses: () =>
                new TestCmdList().waitUntilNotRegex("#navigator", "Protein"),
        };
    }
}
</script>

<style scoped lang="scss"></style>
