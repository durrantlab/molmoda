<template><span></span></template>

<script lang="ts">
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import { PluginParent } from "@/Plugins/Parents/PluginParent/PluginParent";
import * as api from "@/Api";
import { addToUndoStackAfterUserInaction, undo, undoStack } from "./UndoStack";

/**
 * UndoPlugin
 */
@Options({
  components: {
    Popup,
  },
})
export default class UndoPlugin extends PluginParent {
  // @Prop({ required: true }) softwareCreditsToShow!: ISoftwareCredit[];
  // @Prop({ required: true }) contributorCreditsToShow!: IContributorCredit[];

  menuPath = ["[5] Edit", "[0] Revisions", "[1] Undo"];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "undo";

  /**
   * Runs when the user first starts the plugin. 
   */
  onPluginStart() {
    this.submitJobs();
  }

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkUseAllowed(): string | null {
    if (undoStack.length === 0) {
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
   */
  runJob() {
    undo(this.$store);
  }
}
</script>

<style scoped lang="scss"></style>
