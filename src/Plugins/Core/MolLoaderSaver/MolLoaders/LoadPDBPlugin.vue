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

@Options({
  components: {
    PopupOneTextInput,
  },
})
export default class LoadFilePlugin extends PopupPluginParent {
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

  isBtnEnabled(): boolean {
    return this.pdbId.length === 4;
  }

  beforePopupOpen(): void {
    this.pdbId = "";
  }

  /**
   * Filters text to match desired format.
   * 
   * @param {string} pdb  The text to evaluate.
   * @returns {string} The filtered text.
   */
  filterUserData(pdb: string): string {
    pdb = pdb.toUpperCase();

    // Keep only numbers and letters
    pdb = pdb.replace(/[^A-Z0-9]/g, "");

    pdb = pdb.substring(0, 4);
    return pdb;
  }

  /**
   * Runs when the popup closes.
   */
  onPopupDone() {
    this.closePopup();

    loadRemote(`https://files.rcsb.org/view/${this.pdbId.toUpperCase()}.pdb`)
      .then((fileInfo: IFileInfo) => {
        this.submitJobs([fileInfo]);
      })
      .catch((err: string) => {
        // TODO: Check if CIF exists?
        api.messages.popupError(err);
      });
  }

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
