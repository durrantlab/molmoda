<template>
  <!-- TODO: ???? below -->
  <PopupOneTextInput
    v-model="open"
    title="Save PDB and Mol2 Files"
    :intro="intro"
    placeHolder="Enter Filename (e.g., my_molecules.zip)"
    :isActionBtnEnabled="isBtnEnabled"
    :filterFunc="filterFunc"
    actionBtnTxt="Save"
    @onDone="onDone"
  ></PopupOneTextInput>
</template>

<script lang="ts">
import { PluginParent } from "@/Plugins/PluginParent";
import { Options } from "vue-class-component";
import PopupOneTextInput from "@/UI/Layout/Popups/PopupOneTextInput.vue";
import {
  fileNameFilter,
  getFileNameParts,
  matchesFilename,
} from "@/FileSystem/Utils";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import { convertToPDB } from "@/FileSystem/LoadSaveMolModels/ConvertToPDB";
import { ISaveTxt } from "@/Core/FS";
import * as api from "@/Api";
import { slugify } from "@/Core/Utils";
import { IAtom, ICommonNode, IMolEntry } from "@/UI/Navigation/TreeView/TreeInterfaces";

@Options({
  components: {
    PopupOneTextInput,
  },
})
export default class SavePDBMol2Plugin extends PluginParent {
  menuPath = "File/Molecules/[6] Export/PDB & Mol2";
  softwareCredits: ISoftwareCredit[] = []; // TODO: 3dmoljs
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "savepdbmol2";

  intro = `Please provide the name of the ZIP file to save. Note that the
      extension ".zip" will be automatically appended. The ZIP file will
      contain the PDB and MOL2 files of all visible molecules.`;

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

  private _getFilename(node: IMolEntry, ext: string): string {
    let txtPrts = [getFileNameParts(node.src as string).basename];
    let firstAtom: IAtom = node.model.selectedAtoms({})[0];
    if (node.type === "compound") {
      txtPrts.push(firstAtom.resn.trim());
      txtPrts.push(firstAtom.resi.toString().trim());
    }

    txtPrts.push(firstAtom.chain.trim());
    txtPrts.push(node.type as string);

    // remove undefined or ""
    txtPrts = txtPrts.filter((x) => x);

    return slugify(txtPrts.join("-"), false) + "." + ext;
  }

  runJob(parameters: any) {
    let filename = parameters.filename;

    // Get all the visible molecules.
    let molecules = this.$store.state["molecules"];
    let terminalNodes = getTerminalNodes(molecules);
    let visibleTerminalNodes = terminalNodes.filter((node) => node.visible);

    let compoundNodes = visibleTerminalNodes.filter(
      (node) => node.type === "compound"
    );
    let nonCompoundNodes = visibleTerminalNodes.filter(
      (node) => node.type !== "compound"
    );

    const mergeNonCompounds = false;

    let compoundTxts = convertToPDB(
      compoundNodes.map((node) => node.model),
      false // Never merge compounds
    );

    let nonCompoundTxts = convertToPDB(
      nonCompoundNodes.map((node) => node.model),
      mergeNonCompounds
    );

    let files = compoundTxts.map((txt, idx) => {
      // Prepend the chain
      let molEntry = compoundNodes[idx];

      return {
        fileName: this._getFilename(molEntry, "pdb"),
        content: txt,
        ext: ".pdb",
      } as ISaveTxt;
    });

    files.push(
      ...nonCompoundTxts.map((txt, idx) => {
        return {
          fileName: this._getFilename(nonCompoundNodes[idx], "pdb"),
          content: txt,
          ext: ".pdb",
        } as ISaveTxt;
      })
    );

    api.fs.saveZipWithTxtFiles(
      {
        fileName: filename,
      } as ISaveTxt,
      files
    );
  }
}
</script>

<style scoped lang="scss"></style>
