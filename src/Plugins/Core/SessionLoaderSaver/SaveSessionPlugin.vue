<template>
  <PopupOneTextInput
    v-model:openValue="open"
    title="Save a Session"
    :intro="introToUse"
    placeHolder="Enter Filename (e.g., my_session.biotite)"
    :isActionBtnEnabled="isBtnEnabled()"
    :filterFunc="filterUserData"
    actionBtnTxt="Save"
    @onTextDone="onPopupDone"
    v-model:text="filename"
    :prohibitCancel="windowClosing"
  ></PopupOneTextInput>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import { saveState, setStoreIsDirty } from "@/Store/LoadAndSaveStore";
import PopupOneTextInput from "@/UI/Layout/Popups/PopupOneTextInput.vue";
import { fileNameFilter, matchesFilename } from "@/FileSystem/Utils";
import { PopupPluginParent } from "@/Plugins/PopupPluginParent";
import * as api from "@/Api";

@Options({
  components: {
    PopupOneTextInput,
  },
})
export default class SaveSessionPlugin extends PopupPluginParent {
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

  windowClosing = false;

  filename = "";

  get introToUse(): string {
    let i = "";
    
    if (this.windowClosing) {
      i += "Be sure to save your work before closing!</p><p>";
    }

    i += this.intro;

    return i;
  }

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

  checkUseAllowed(): string | null {
    if (this.$store.state.molecules.length === 0) {
      return "Nothing to save (empty project). Try adding molecules first.";
    }

    return null;
  }

  beforePopupOpen(): void {
    this.windowClosing = this.payload !== undefined;
    this.payload = undefined;
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

    // Add .biotite to end if not already there
    if (!filename.endsWith(".biotite")) {
      filename += ".biotite";
    }

    saveState(filename, this.$store.state)
    .then(() => {
      setStoreIsDirty(false);
      if (this.windowClosing) {
        api.messages.popupMessage("Session Ended", "Your file has been saved. You may now close this tab/window.");
      }
      return;
    })
    .catch((err: any) => {
      console.log(err);
    });
  }
}
</script>

<style scoped lang="scss"></style>
