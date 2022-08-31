<template>
  <PopupOneTextInput
    v-model:openValue="open"
    title="Save a VRML Model"
    :intro="intro"
    placeHolder="Enter Filename (e.g., my_model.vrml)"
    :isActionBtnEnabled="isBtnEnabled()"
    :filterFunc="filterUserData"
    actionBtnTxt="Save"
    v-model:text="filename"
    @onTextDone="onPopupDone"
  ></PopupOneTextInput>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import * as api from "@/Api";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { fileNameFilter, matchesFilename } from "@/FileSystem/Utils";
import PopupOneTextInput from "@/UI/Layout/Popups/PopupOneTextInput.vue";
import { ISaveTxt } from "@/Core/FS";
import { PopupPluginParent } from "@/Plugins/PopupPluginParent";

@Options({
  components: {
    PopupOneTextInput,
  },
})
export default class SaveVRMLPlugin extends PopupPluginParent {
  menuPath = "File/Molecules/[6] Export/VRML";
  softwareCredits: ISoftwareCredit[] = []; // TODO: 3dmoljs
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "savevrml";

  intro = `Please provide the name of the VRML file to save. Note that the
      extension ".vrml" will be automatically appended.`;

  filename = "";

  /**
   * Filters text to match desired format.
   * 
   * @param {string} filename  The text to evaluate.
   * @returns {string} The filtered text.
   */
  filterUserData(filename: string): string {
    return fileNameFilter(filename);
  }

  /**
   * If text is a properly formatted UniProt accession, enable the button.
   * Otherwise, disabled.
   * 
   * @returns {boolean} Whether to disable the button.
   */
  isBtnEnabled(): boolean {
    return matchesFilename(this.filename);
  }

  beforePopupOpen(): void {
    this.filename = "";
  }

  /**
   * Runs when the popup closes.
   */
  onPopupDone() {
    this.closePopup();
    this.submitJobs([{ filename: this.filename }]);
  }

  runJob(parameters: any) {
    let filename = parameters.filename;
    let vrmlTxt = api.visualization.viewer.exportVRML();
    api.fs.saveTxt({
      fileName: filename,
      content: vrmlTxt,
      ext: ".vrml",
    } as ISaveTxt);
    api.visualization.viewer.render();
  }
}
</script>

<style scoped lang="scss"></style>
