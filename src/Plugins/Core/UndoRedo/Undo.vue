<template><span></span></template>

<script lang="ts">
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import { PluginParent } from "@/Plugins/PluginParent";
import * as api from "@/Api";
import { addToUndoStack, undo, undoStack } from "./UndoStack";

@Options({
  components: {
    Popup,
  },
})
export default class Undo extends PluginParent {
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

  onPluginStart() {
    this.submitJobs();
  }

  checkUseAllowed(): string | null {
    if (undoStack.length === 0) {
      return "No additional undo is available.";
    }
    return null;
  }

  onMounted() {
    api.hooks.onMoleculesChanged(addToUndoStack);
  }

  runJob() {
    // About plugin does not have a job.
    undo(this.$store);
  }
}
</script>

<style scoped lang="scss"></style>
