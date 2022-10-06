<template>
  <PluginComponent
    v-model="open"
    title=""
    :userInputs="userInputs"
    :intro="intro"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import * as api from "@/Api";
import { addToUndoStackAfterUserInaction, undo, undoStack } from "./UndoStack";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";

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

  menuPath = ["[5] Edit", "[0] Revisions", "[1] Undo"];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "undo";
  intro = ""; // Not used
  noPopup = true;
  userInputs: FormElement[] = [];

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
