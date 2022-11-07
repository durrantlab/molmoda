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
      :multiple="true"
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
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass, RunJobReturn } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/ParentPluginTestFuncs";
import { IFileInfo } from "@/FileSystem/Types";
import {
  fileTypesAccepts,
  parseMoleculeFile,
} from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import { filesToFileInfos } from "@/FileSystem/Utils";
import * as api from "@/Api";

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
  accept = fileTypesAccepts;

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
    if (this.filesToLoad.length > 0) {
      this.submitJobs(this.filesToLoad);
    }
  }

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   *
   * @returns {boolean | Promise<boolean>}  Whether to open the popup.
   */
  onBeforePopupOpen(): boolean | Promise<boolean> {
    // Below is hackish...
    (this.$refs.formFile as FormFile).clearFile();

    if (this.payload !== undefined) {
      let fileList = this.payload as File[];
      this.payload = undefined;

      return filesToFileInfos(
        fileList,
        false,
        this.accept.split(",").map((a) => a.toUpperCase().substring(1))
      )
        .then((fileInfos: (IFileInfo | string)[]) => {
          const errorMsgs = fileInfos.filter((a) => typeof a === "string");

          if (errorMsgs.length > 0) {
            api.messages.popupError("<p>" + errorMsgs.join("</p><p>") + "</p>");
          }

          const toLoad = fileInfos.filter(
            (a) => typeof a !== "string"
          ) as IFileInfo[];

          this.filesToLoad = toLoad;
          this.onPopupDone();
          return false;
        })
        .catch((err) => {
          console.error(err);
          return false;
        });
    }
    return true;
    // this.windowClosing = this.payload !== undefined;
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IFileInfo} fileInfo  Information about the molecules to save.
   * @returns {Promise<undefined>}  A promise that resolves when the job is
   *     done.
   */
  runJobInBrowser(fileInfo: IFileInfo): RunJobReturn {
    // It's not a biotite file (e.g., a PDB file).
    return fileInfo;
  }

  /**
   * Gets the selenium test commands for the plugin. For advanced use.
   *
   * @gooddefault
   * @document
   * @returns {ITest}  The selenium test commands.
   */
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
