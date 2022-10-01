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
import { PopupPluginParentRenderless } from "@/Plugins/Parents/PopupPluginParent/PopupPluginParentRenderless";
import { checkanyMolLoaded } from "../../CheckUseAllowedUtils";

/**
 * SaveVRMLPlugin
 */
@Options({
  components: {
    PopupOneTextInput,
  },
})
export default class SaveVRMLPlugin extends PopupPluginParentRenderless {
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

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkUseAllowed(): string | null {
    return checkanyMolLoaded(this);
  }

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   */
  beforePopupOpen() {
    this.filename = "";
  }

  /**
   * Runs when the user presses the action button and the popup closes.
   */
  onPopupDone() {
    this.closePopup();
    this.submitJobs([{ filename: this.filename }]);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {any} parameters  Information about the VRML file to save.
   * @returns {Promise<undefined>}  A promise that resolves when the job is
   *     done.
   */
  runJob(parameters: any): Promise<undefined> {
    let filename = parameters.filename;
    let vrmlTxt = api.visualization.viewer.exportVRML();
    api.visualization.viewer.render();
    
    return api.fs.saveTxt({
      fileName: filename,
      content: vrmlTxt,
      ext: ".vrml",
    } as ISaveTxt);
  }
}
</script>

<style scoped lang="scss"></style>
