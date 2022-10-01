<template><PluginParent></PluginParent></template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import { PluginParentRenderless } from "@/Plugins/Parents/PluginParent/PluginParentRenderless";
import { redo, redoStack } from "./UndoStack";
import PluginParent from "@/Plugins/Parents/PluginParent/PluginParent.vue";

/**
 * RedoPlugin
 */
@Options({
  components: {
    PluginParent
  },
})
export default class RedoPlugin extends PluginParentRenderless {
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
