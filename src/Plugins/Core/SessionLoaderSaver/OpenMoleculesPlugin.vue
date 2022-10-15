<template>
  <PluginComponent
    :userArgs="userArgs"
    title="Open Molecule Files"
    v-model="open"
    cancelBtnTxt="Cancel"
    actionBtnTxt="Open"
    :pluginId="pluginId"
    @onPopupDone="onPopupDone"
    :isActionBtnEnabled="filesToLoad.length > 0"
  >
    <FormFile
      ref="formFile"
      :multiple="false"
      @onFilesLoaded="onFilesLoaded"
      :accept="accept"
      id="formFile-openmolecules-item"
    />
    <!-- :isZip="true" -->
  </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import FormFile from "@/UI/Forms/FormFile.vue";
import { jsonToState } from "@/Store/LoadAndSaveStore";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/ParentPluginTestFuncs";
import { IFileInfo } from "@/FileSystem/Definitions";
import { fileTypesAccepts, loadMoleculeFile } from "@/FileSystem/LoadSaveMolModels/LoadMolModels/LoadMoleculeFiles";

/**
 * OpenMoleculesPlugin
 */
@Options({
  components: {
    PluginComponent,
    FormFile,
  },
})
export default class OpenMoleculesPlugin extends PluginParentClass {
  menuPath = "[3] File/[1] Project/[0] Open...";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  filesToLoad: IFileInfo[] = [];
  pluginId = "openmolecules";

  userArgs: FormElement[] = [];
  alwaysEnabled = true;
  accept = `.biotite,${fileTypesAccepts}`;

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
  onBeforePopupOpen() {
    // Below is hackish...
    (this.$refs.formFile as FormFile).clearFile();
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IFileInfo} fileInfo  Information about the molecules to save.
   * @returns {Promise<undefined>}  A promise that resolves when the job is
   *     done.
   */
  runJob(fileInfo: IFileInfo): Promise<any> {
    if (fileInfo.type === "BIOTITE") {
      // It's a biotite file.
      return jsonToState(fileInfo.contents)
        .then((state) => {
          this.$store.replaceState(state);
          return undefined;
        })
        .catch((err: any) => {
          console.error(err);
          return undefined;
        });
    }

    // It's not a biotite file (e.g., a PDB file).
    return loadMoleculeFile(fileInfo);  // promise
  }

  getTests(): ITest {
    return {
      populateUserArgs: [
        this.testUserArg("formFile", "file://./src/Testing/test.biotite"),
      ],
      afterPluginCloses: [
        this.testWaitForRegex("#styles", "Protein"),
        this.testWaitForRegex("#log", 'Job "openmolecules:.+?" ended'),
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
