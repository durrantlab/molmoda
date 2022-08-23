<template>
  <PopupOneTextInput
    v-model="open"
    title="Rename Molecule"
    :intro="intro"
    placeHolder="New molecule name"
    :isActionBtnEnabled="isBtnEnabled"
    :filterFunc="filterUserData"
    actionBtnTxt="Rename"
    @onTextDone="onPopupDone"
    :defaultVal="existingTitle"
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

@Options({
  components: {
    PopupOneTextInput,
  },
})
export default class RenameMol extends EditBarPluginParent {
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
  existingTitle = "";

  protected onPopupOpen(): void {
    this.setNodeToActOn();
    this.existingTitle =
      (this.nodeToActOn?.title as string);
  }

  runJob(newName: string) {
    if (this.nodeToActOn) {
      this.nodeToActOn.title = newName;
    }
  }
}
</script>

<style scoped lang="scss"></style>
