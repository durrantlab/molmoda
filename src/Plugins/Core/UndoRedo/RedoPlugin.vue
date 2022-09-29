<template><span></span></template>

<script lang="ts">
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import { PluginParent } from "@/Plugins/Parents/PluginParent/PluginParent";
import { redo, redoStack } from "./UndoStack";

/**
 * RedoPlugin
 */
@Options({
  components: {
    Popup,
  },
})
export default class RedoPlugin extends PluginParent {
  // @Prop({ required: true }) softwareCreditsToShow!: ISoftwareCredit[];
  // @Prop({ required: true }) contributorCreditsToShow!: IContributorCredit[];

  menuPath = ["[5] Edit", "Revisions", "[2] Redo"];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "redo";

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
    if (redoStack.length === 0) {
      return "No additional redo is available.";
    }
    return null;
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   */
  runJob() {
    redo(this.$store);
  }
}
</script>

<style scoped lang="scss"></style>
