<template>
  <PopupOneTextInput
    v-model="open"
    title="Load AlphaFold Structure"
    :intro="intro"
    placeHolder="Enter UniProt Accession (e.g., P86927)"
    :isActionBtnEnabled="isBtnEnabled"
    :filterFunc="filterUserData"
    actionBtnTxt="Load"
    @onTextDone="onPopupDone"
  ></PopupOneTextInput>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { loadMoleculeFile } from "@/FileSystem/LoadMoleculeFiles";
import PopupOneTextInput from "@/UI/Layout/Popups/PopupOneTextInput.vue";
import { IFileInfo } from "@/FileSystem/Interfaces";
import { loadRemote } from "./Utils";
import { IContributorCredit, ISoftwareCredit } from "@/Plugins/PluginInterfaces";
import { PopupPluginParent } from "@/Plugins/PopupPluginParent";

@Options({
  components: {
    PopupOneTextInput,
  },
})
export default class LoadAlphaFoldPlugin extends PopupPluginParent {
  menuPath = "File/Molecules/Import/[4] AlphaFold";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
    {
      name: "AlphaFold Protein Structure Database",
      url: "https://alphafold.ebi.ac.uk/",
    },
  ];
  pluginId = "loadalphafold";

  intro = `Enter the UniProt Accession of the protein structure. Search the
      <a href="https://alphafold.ebi.ac.uk/" target="_blank"
        >AlphaFold Protein Structure Database</a
      >, a database of predicted protein structures, if you're uncertain.`;

  /**
   * Filters text to match desired format.
   * @param {string} uniprot  The text to evaluate.
   * @returns The filtered text.
   */
  filterUserData(uniprot: string) {
    // https://www.uniprot.org/help/accession_numbers

    uniprot = uniprot.toUpperCase();

    // Keep only numbers and letters
    uniprot = uniprot.replace(/[^A-Z0-9]/g, "");

    uniprot = uniprot.substring(0, 10);
    return uniprot;
  }

  /**
   * If text is a properly formatted UniProt accession, enable the button.
   * Otherwise, disabled.
   * @param {string} uniprot  The text to evaluate.
   * @returns A boolean value, whether to disable the button.
   */
  isBtnEnabled(uniprot: string): boolean {
    // // https://www.uniprot.org/help/accession_numbers
    let r =
      /[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}/;

    // Return bool whether text matches regex
    return uniprot.match(r) !== null;
  }

  /**
   * Runs when the popup closes.
   * @param {string} uniprot  The text entered into the popup.
   * @returns void
   */
  onPopupDone(uniprot: string): void {
    this.closePopup();

    loadRemote(
      `https://alphafold.ebi.ac.uk/api/prediction/${uniprot.toUpperCase()}`
    )
      .then((fileInfo: IFileInfo) => {
        let json = JSON.parse(fileInfo.contents);
        let pdbUrl = json[0]["pdbUrl"]; // TODO: When would there be multiple entreis?
        if (pdbUrl) {
          // Load the PDB file.
          loadRemote(pdbUrl).then((fileInf: IFileInfo): void => {
            this.submitJobs([fileInf]);
          });
        }
      })
      .catch((err: string) => {
        this.$emit("onError", err);
      });
  }

  runJob(parameters: IFileInfo) {
    loadMoleculeFile(parameters);
  }
}
</script>

<style scoped lang="scss"></style>
