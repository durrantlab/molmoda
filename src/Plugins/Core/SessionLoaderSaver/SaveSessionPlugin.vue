<template>
  <PopupOneTextInput
    v-model="open"
    title="Save a Session"
    :intro="intro"
    placeHolder="Enter Filename (e.g., my_session.biotite)"
    :isActionBtnEnabled="isBtnEnabled"
    :filterFunc="filterFunc"
    actionBtnTxt="Save"
    @onDone="onDone"
  ></PopupOneTextInput>
</template>

<script lang="ts">
import { PluginParent } from "@/Plugins/PluginParent";
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import { saveState } from "@/Store/LoadAndSaveStore";
import PopupOneTextInput from "@/UI/Layout/Popups/PopupOneTextInput.vue";
import { fileNameFilter, matchesFilename } from "@/FileSystem/Utils";

@Options({
  components: {
    PopupOneTextInput,
  },
})
export default class SaveSessionPlugin extends PluginParent {
  menuPath = "File/Session/[1] Save As";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "savesession";

  intro = `Please provide the name of the session file to save. Note that the
      extension ".biotite" will be automatically appended.`;

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

    // Add .biotite to end if not already there
    if (!filename.endsWith(".biotite")) {
      filename += ".biotite";
    }

    saveState(filename, this.$store.state);
  }
}
</script>

<style scoped lang="scss"></style>
