<template>
  <PluginComponent
    :userInputs="userInputs"
    v-model="open"
    title="Load a File"
    actionBtnTxt="Load"
    cancelBtnTxt="Cancel"
    :intro="intro"
    @onPopupDone="onPopupDone"
    :isActionBtnEnabled="filesToLoad.length > 0"
  >
    <FormFile ref="formFile" @onFilesLoaded="onFilesLoaded" :accept="accept" />
  </PluginComponent>
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
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";

/**
 * LoadFilePlugin
 */
@Options({
  components: {
    PluginComponent,
    FormFile,
  },
})
export default class LoadFilePlugin extends PluginParentClass {
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

  userInputs: FormElement[] = [];
  alwaysEnabled = true;
  
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
    this.submitJobs(this.filesToLoad);
  }

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   */
  beforePopupOpen() {
    // Below is hackish...
    (this.$refs.formFile as FormFile).clearFile();
    this.filesToLoad = [];
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
