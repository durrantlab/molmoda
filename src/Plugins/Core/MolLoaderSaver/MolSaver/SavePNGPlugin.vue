<template>
  <PopupOneTextInput
    v-model:openValue="open"
    title="Save a PNG Image"
    :intro="intro"
    placeHolder="Enter Filename (e.g., my_image.png)"
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
import PopupOneTextInput from "@/UI/Layout/Popups/PopupOneTextInput.vue";
import { fileNameFilter, matchesFilename } from "@/FileSystem/Utils";
import { IContributorCredit, ISoftwareCredit } from "@/Plugins/PluginInterfaces";
import { PopupPluginParent } from "@/Plugins/PopupPluginParent";

@Options({
  components: {
    PopupOneTextInput
  },
})
export default class SavePNGPlugin extends PopupPluginParent {
  menuPath = "File/Molecules/[6] Export/PNG";
  softwareCredits: ISoftwareCredit[] = []; // TODO: 3dmoljs
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "savepng";

  intro = `Please provide the name of the PNG file to save. Note that the
      extension ".png" will be automatically appended.`;

  filename = "";

  /**
   * Filters text to match desired format.
   * 
   * @param {string} filename  The text to assess.
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

    let pngUri = api.visualization.viewer.pngURI();
    api.fs.savePngUri(filename, pngUri);
  }
}
</script>

<style scoped lang="scss"></style>
