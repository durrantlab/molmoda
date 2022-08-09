<template>
  <PopupOneTextInput
    v-model="open"
    title="Load PDB ID"
    :intro="intro"
    placeHolder="Enter PDB ID (e.g., 1XDN)"
    :isActionBtnEnabled="isActionBtnEnabled"
    :filterFunc="filterFunc"
    actionBtnTxt="Load"
    @onDone="onDone"
  ></PopupOneTextInput>
</template>

<script lang="ts">
import { PluginParent } from "@/Plugins/PluginParent";
import { Options } from "vue-class-component";
import { loadMoleculeFile } from "@/FileSystem/LoadMoleculeFiles";
import PopupOneTextInput from "@/UI/Layout/Popups/PopupOneTextInput.vue";
import { IFileInfo } from "@/FileSystem/Interfaces";
import { IContributorCredit, ISoftwareCredit } from "@/Plugins/PluginInterfaces";
import { loadRemote } from "./Utils";

@Options({
  components: {
    PopupOneTextInput,
  },
})
export default class LoadFilePlugin extends PluginParent {
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

  open = false;

  intro = `Enter the PDB ID of the molecular structure. Search the
      <a href="https://www.rcsb.org/" target="_blank">Protein Data Bank</a>, a
      database of biological molecules (e.g., proteins and nucleic acids), if
      you're uncertain.`;

  isActionBtnEnabled(pdbId: string): boolean {
    return pdbId.length === 4;
  }

  /**
   * Filters text to match desired format.
   * @param {string} pdbId  The text to evaluate.
   * @returns The filtered text.
   */
  filterFunc(pdbId: string) {
    pdbId = pdbId.toUpperCase();

    // Keep only numbers and letters
    pdbId = pdbId.replace(/[^A-Z0-9]/g, "");

    pdbId = pdbId.substring(0, 4);
    return pdbId;
  }

  /**
   * Runs when the popup closes.
   * @param {string} pdbId  The text entered into the popup.
   * @returns void
   */
  onDone(pdbId: string): void {
    this.open = false;

    loadRemote(`https://files.rcsb.org/view/${pdbId.toUpperCase()}.pdb`)
      .then((fileInfo: IFileInfo) => {
        this._submitJobs([fileInfo]);
      })
      .catch((err: string) => {
        // TODO: Check if CIF exists?
        this.$emit("onError", err);
      });
  }

  start(): void {
    this.open = true;
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
