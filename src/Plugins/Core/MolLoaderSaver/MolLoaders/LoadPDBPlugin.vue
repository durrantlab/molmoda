<template>
  <PopupOneTextInput
    v-model:openValue="open"
    title="Load PDB ID"
    :intro="intro"
    placeHolder="Enter PDB ID (e.g., 1XDN)"
    :isActionBtnEnabled="isBtnEnabled()"
    :filterFunc="filterUserData"
    actionBtnTxt="Load"
    v-model:text="pdbId"
    @onTextDone="onPopupDone"
  ></PopupOneTextInput>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { loadMoleculeFile } from "@/FileSystem/LoadMoleculeFiles";
import PopupOneTextInput from "@/UI/Layout/Popups/PopupOneTextInput.vue";
import { IFileInfo } from "@/FileSystem/Interfaces";
import { IContributorCredit, ISoftwareCredit } from "@/Plugins/PluginInterfaces";
import { loadRemote } from "./Utils";
import { PopupPluginParent } from "@/Plugins/PopupPluginParent";
import * as api from "@/Api";

/**
 * LoadPDBPlugin
 */
@Options({
  components: {
    PopupOneTextInput,
  },
})
export default class LoadPDBPlugin extends PopupPluginParent {
  menuPath = "File/Molecules/Import/[2] Protein Data Bank";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
    {
      name: "Protein Data Bank",
      url: "https://www.rcsb.org/",
    },
  ];
  pluginId = "loadpdb";

  intro = `Enter the PDB ID of the molecular structure. Search the
      <a href="https://www.rcsb.org/" target="_blank">Protein Data Bank</a>, a
      database of biological molecules (e.g., proteins and nucleic acids), if
      you're uncertain.`;

  pdbId = "";

  /**
   * If the user data is a properly formatted, enable the button. Otherwise,
   * disabled.
   *
   * @returns {boolean} A boolean value, whether to disable the button.
   */
  isBtnEnabled(): boolean {
    return this.pdbId.length === 4;
  }

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   */
  beforePopupOpen() {
    this.pdbId = "";
  }

  /**
   * Filters text to match desired format.
   * 
   * @param {string} pdb  The text to assess.
   * @returns {string} The filtered text.
   */
  filterUserData(pdb: string): string {
    pdb = pdb.toUpperCase();

    // Keep numbers and letters
    pdb = pdb.replace(/[^A-Z\d]/g, "");

    pdb = pdb.substring(0, 4);
    return pdb;
  }

  /**
   * Runs when the user presses the action button and the popup closes.
   */
  onPopupDone() {
    this.closePopup();

    loadRemote(`https://files.rcsb.org/view/${this.pdbId.toUpperCase()}.pdb`)
      .then((fileInfo: IFileInfo) => {
        this.submitJobs([fileInfo]);
        return;
      })
      .catch((err: string) => {
        // TODO: Check if CIF exists?
        api.messages.popupError(err);
      });
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
