<template><span></span></template>

<script lang="ts">
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import { PluginParent } from "@/Plugins/PluginParent";
import * as api from "@/Api";
import { addToUndoStack, redo, redoStack, undo } from "./UndoStack";

@Options({
  components: {
    Popup,
  },
})
export default class Redo extends PluginParent {
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

  onPluginStart() {
    this.submitJobs();
  }

  checkUseAllowed(): string | null {
    if (redoStack.length === 0) {
      return "No additional redo is available.";
    }
    return null;
  }

  onMounted() {
    // api.hooks.onMoleculesChanged(addToUndoStack);
  }

  runJob() {
    // About plugin does not have a job.
    redo(this.$store);
  }
}
</script>

<style scoped lang="scss"></style>
