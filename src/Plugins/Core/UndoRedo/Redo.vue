<template><span></span></template>

<script lang="ts">
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import { PluginParent } from "@/Plugins/PluginParent";
import * as api from "@/Api";
import { addToUndoStack, redo, undo } from "./UndoStack";

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
