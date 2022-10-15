<template>
  <PluginComponent
    :userArgs="userArgs"
    v-model="open"
    title="Load a File"
    actionBtnTxt="Load"
    cancelBtnTxt="Cancel"
    :pluginId="pluginId"
    @onPopupDone="onPopupDone"
    :isActionBtnEnabled="filesToLoad.length > 0"
  >
    <FormFile
      ref="formFile"
      @onFilesLoaded="onFilesLoaded"
      :accept="accept"
      id="formFile-loadfile-item"
    />
  </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import FormFile from "@/UI/Forms/FormFile.vue";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";

import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass, RunJobReturn } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/ParentPluginTestFuncs";
import { fileTypesAccepts, loadMoleculeFile } from "@/FileSystem/LoadSaveMolModels/LoadMolModels/LoadMoleculeFiles";
import { IFileInfo } from "@/FileSystem/Definitions";

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

  userArgs: FormElement[] = [];
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
  onBeforePopupOpen() {
    // Below is hackish...
    (this.$refs.formFile as FormFile).clearFile();
    this.filesToLoad = [];
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IFileInfo} fileInfo  Information about the molecule to load.
   * @returns {RunJobReturn}  The return object. A promise that resolves the
   *     molecule container.
   */
  runJob(fileInfo: IFileInfo): RunJobReturn {
    return loadMoleculeFile(fileInfo);  // promise
  }

  getTests(): ITest {
    return {
      populateUserArgs: [
        this.testUserArg("formFile", "file://./src/Testing/4WP4.pdb"),
      ],
      afterPluginCloses: [
        this.testWaitForRegex("#styles", "Protein"),
        this.testWaitForRegex("#log", 'Job "loadfile:.+?" ended'),
      ],
    };
  }
}
</script>

<style scoped lang="scss">
.inverse-indent {
  text-indent: -1em;
  padding-left: 1em;
}
</style>
