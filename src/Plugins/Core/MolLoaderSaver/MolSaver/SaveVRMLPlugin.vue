<template>
  <PopupOneTextInput
    v-model="open"
    title="Save a VRML Model"
    :intro="intro"
    placeHolder="Enter Filename (e.g., my_model.vrml)"
    :isActionBtnEnabled="isBtnEnabled"
    :filterFunc="filterFunc"
    actionBtnTxt="Save"
    @onDone="onDone"
  ></PopupOneTextInput>
</template>

<script lang="ts">
import { PluginParent } from "@/Plugins/PluginParent";
import { Options } from "vue-class-component";
import * as api from "@/Api";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { fileNameFilter, matchesFilename } from "@/FileSystem/Utils";
import PopupOneTextInput from "@/UI/Layout/Popups/PopupOneTextInput.vue";
import { ISaveTxt } from "@/Core/FS";

@Options({
  components: {
    PopupOneTextInput,
  },
})
export default class SaveVRMLPlugin extends PluginParent {
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

  open = false;

  /**
   * Filters text to match desired format.
   * @param {string} filename  The text to evaluate.
   * @returns The filtered text.
   */
  filterFunc(filename: string) {
    return fileNameFilter(filename);
  }

  /**
   * If text is a properly formatted UniProt accession, enable the button.
   * Otherwise, disabled.
   * @param {string} filename  The text to evaluate.
   * @returns A boolean value, whether to disable the button.
   */
  isBtnEnabled(filename: string): boolean {
    return matchesFilename(filename);
  }

  /**
   * Runs when the popup closes.
   * @param {string} filename  The text entered into the popup.
   * @returns void
   */
  onDone(filename: string): void {
    this.open = false;
    this._submitJobs([{ filename }]);
  }

  start(): void {
    this.open = true;
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
