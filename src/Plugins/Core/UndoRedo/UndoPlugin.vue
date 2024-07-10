<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onUserArgChanged="onUserArgChanged"
    ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import * as api from "@/Api";
import { addToUndoStackAfterUserInaction, undo } from "./UndoStack";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { Tag } from "@/Plugins/Tags/Tags";

/**
 * UndoPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class UndoPlugin extends PluginParentClass {
    // @Prop({ required: true }) softwareCreditsToShow!: ISoftwareCredit[];
    // @Prop({ required: true }) contributorCreditsToShow!: IContributorCredit[];

    menuPath = ["Edit", "[0] Revisions", "[1] Undo"];
    title = "";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //   name: "Jacob D. Durrant",
        //   url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "undo";
    noPopup = true;
    userArgDefaults: UserArg[] = [];
    
    logJob = false;
    hotkey = "z";
    intro = "Undo the last action.";
    tags = [Tag.All];

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        const undoStackWithoutEmptys = this.$store.state.undoStack.filter(
            (x: TreeNodeList) => x.length > 0
        );

        if (undoStackWithoutEmptys.length === 0) {
            return "No additional undo is available.";
        }
        return null;
    }

    /**
     * Called when the plugin is mounted.
     */
    onMounted() {
        api.hooks.onMoleculesChanged(addToUndoStackAfterUserInaction);
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     * 
     * @returns {Promise<void>}  Resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        undo(this.$store);
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
            beforePluginOpens: new TestCmdList().loadExampleMolecule(),
            // pluginOpen: [this.testSetUserArg("filename", "test")],
            // afterPluginCloses: new TestCmdList()
            //   .wait(3)
        };
    }
}
</script>

<style scoped lang="scss"></style>
