<template>
  <PopupPluginParent
    title="Load a File"
    v-model="open"
    cancelBtnTxt="Cancel"
    actionBtnTxt="Load"
    @onDone="onPopupDone"
    :isActionBtnEnabled="filesToLoad.length > 0"
  >
    <FormFile ref="formFile" @onFilesLoaded="onFilesLoaded" :accept="accept" />
  </PopupPluginParent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import FormFile from "@/UI/Forms/FormFile.vue";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import {
  fileTypesAccepts,
  loadMoleculeFile,
} from "@/FileSystem/LoadMoleculeFiles";
import { IFileInfo } from "@/FileSystem/Interfaces";
import { PopupPluginParentRenderless } from "@/Plugins/Parents/PopupPluginParent/PopupPluginParentRenderless";
import PopupPluginParent from "@/Plugins/Parents/PopupPluginParent/PopupPluginParent.vue";

/**
 * LoadFilePlugin
 */
@Options({
  components: {
    PopupPluginParent,
    FormFile,
  },
})
export default class LoadFilePlugin extends PopupPluginParentRenderless {
  menuPath = "[4] File/Molecules/Import/[0] Local File";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  accept = fileTypesAccepts;
  filesToLoad: IFileInfo[] = [];
  pluginId = "loadfile";

  intro = ""; // Not used.

  /**
   * Runs when the files are loaded.
   *
   * @param {IFileInfo[]} files  The files that were loaded.
   */
  onFilesLoaded(files: IFileInfo[]) {
    this.filesToLoad = files;
  }

  /**
   * Runs when the popup closes via done button.
   */
  onPopupDone() {
    this.closePopup();
    this.submitJobs(this.filesToLoad);
  }

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   */
  beforePopupOpen() {
    // Below is hackish...
    (this.$refs.formFile as FormFile).clearFile();
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IFileInfo} parameters  Information about the molecule to load.
   */
  runJob(parameters: IFileInfo) {
    loadMoleculeFile(parameters);
  }
}
</script>

<style scoped lang="scss">
.inverse-indent {
  text-indent: -1em;
  padding-left: 1em;
}
</style>
