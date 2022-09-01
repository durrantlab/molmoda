<template>
  <PopupOneTextInput
    v-model:openValue="open"
    title="Rename Molecule"
    :intro="intro"
    placeHolder="New molecule name"
    :isActionBtnEnabled="isBtnEnabled(title)"
    :filterFunc="filterUserData"
    actionBtnTxt="Rename"
    @onTextDone="onPopupDone"
    v-model:text="title"
  ></PopupOneTextInput>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import PopupOneTextInput from "@/UI/Layout/Popups/PopupOneTextInput.vue";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import EditBarPluginParent from "./EditBarPluginParent";

/**
 * RenameMolPlugin
 */
@Options({
  components: {
    PopupOneTextInput,
  },
})
export default class RenameMolPlugin extends EditBarPluginParent {
  menuPath = "Edit/Molecules/[1] Rename";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "renamemol";
  intro = `Enter the new name for this molecule.`;
  title = "";

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   */
  beforePopupOpen() {
    this.setNodeToActOn();
    this.title = this.nodeToActOn?.title;
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {string} newName  The new name of the renamed molecule.
   */ 
  runJob(newName: string) {
    if (this.nodeToActOn) {
      this.nodeToActOn.title = newName;
    }
  }
}
</script>

<style scoped lang="scss"></style>
