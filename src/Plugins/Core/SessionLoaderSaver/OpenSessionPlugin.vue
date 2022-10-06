<template>
  <PluginComponent
    :userInputs="userInputs"
    title="Load a Session"
    v-model="open"
    cancelBtnTxt="Cancel"
    actionBtnTxt="Load"
    @onDone="onPopupDone"
    :isActionBtnEnabled="filesToLoad.length > 0"
    :intro="intro"
  >
    <FormFile
      ref="formFile"
      :multiple="false"
      @onFilesLoaded="onFilesLoaded"
      accept=".biotite"
      :isZip="true"
    />
  </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import FormFile from "@/UI/Forms/FormFile.vue";
import { IFileInfo } from "../../../FileSystem/Interfaces";
import { jsonToState } from "@/Store/LoadAndSaveStore";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";

/**
 * OpenSessionPlugin
 */
@Options({
  components: {
    PluginComponent,
    FormFile,
  },
})
export default class OpenSessionPlugin extends PluginParentClass {
  menuPath = "File/[1] Session/[0] Open";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  filesToLoad: IFileInfo[] = [];
  pluginId = "loadsession";
  intro = ""; // Not used

  userInputs: FormElement[] = [];

  /**
   * Runs when the files are loaded.
   *
   * @param {IFileInfo[]} files  The files that were loaded.
   */
  onFilesLoaded(files: IFileInfo[]) {
    this.filesToLoad = files;
  }

  /**
   * Runs when the user presses the action button and the popup closes.
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
   * @param {IFileInfo} parameters  Information about the molecules to save.
   * @returns {Promise<undefined>}  A promise that resolves when the job is
   *     done.
   */
  runJob(parameters: IFileInfo): Promise<undefined> {
    return jsonToState(parameters.contents)
      .then((state) => {
        this.$store.replaceState(state);
        return undefined;
      })
      .catch((err: any) => {
        console.error(err);
        return undefined;
      });
  }
}
</script>

<style scoped lang="scss">
.inverse-indent {
  text-indent: -1em;
  padding-left: 1em;
}
</style>
