<template>
  <PluginComponent
    :userInputs="userInputs"
    v-model="open"
    title="Save PDB and Mol2 Files"
    actionBtnTxt="Save"
    :intro="intro"
    @onPopupDone="onPopupDone"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
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
import {
  GLModel,
  IAtom,
  IMolContainer,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { checkanyMolLoaded } from "../../CheckUseAllowedUtils";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement, IFormText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";

/**
 * SavePDBMol2Plugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class SavePDBMol2Plugin extends PluginParentClass {
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

  userInputs: FormElement[] = [
    {
      id: "filename",
      label: "",
      val: "",
      placeHolder: "Enter Filename (e.g., my_molecules.zip)",
      filterFunc: (filename: string): string => {
        return fileNameFilter(filename);
      },
      validateFunc: (filename: string): boolean => {
        return matchesFilename(filename);
      },
    } as IFormText,
  ];

  alwaysEnabled = true;

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkUseAllowed(): string | null {
    return checkanyMolLoaded(this);
  }

  /**
   * Runs when the user presses the action button and the popup closes.
   *
   * @param {IUserArg[]} userParams  The user arguments.
   */
  onPopupDone(userParams: IUserArg[]) {
    this.closePopup();
    this.submitJobs([{ filename: userParams[0].val }]);
  }

  /**
   * Get a filename appropriate for a given node (molecule).
   *
   * @param {IMolContainer} molContainer  The molecule.
   * @param {string} ext  The extension to use.
   * @returns {string} The filename.
   */
  private _getFilename(molContainer: IMolContainer, ext: string): string {
    let txtPrts = [getFileNameParts(molContainer.src as string).basename];
    let firstAtom: IAtom = (molContainer.model as any).selectedAtoms({})[0];
    if (molContainer.type === "compound") {
      txtPrts.push(firstAtom.resn.trim());
      txtPrts.push(firstAtom.resi.toString().trim());
    }

    txtPrts.push(firstAtom.chain.trim());
    txtPrts.push(molContainer.type as string);

    // remove undefined or ""
    txtPrts = txtPrts.filter((x) => x);

    return slugify(txtPrts.join("-"), false) + "." + ext;
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {any} parameters  Information about the molecules to save.
   * @returns {Promise<undefined>}  A promise that resolves when the job is done.
   */
  runJob(parameters: any): Promise<undefined> {
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
      compoundNodes.map((node) => node.model) as GLModel[],
      false // Never merge compounds
    );

    let nonCompoundTxts = convertToPDB(
      nonCompoundNodes.map((node) => node.model) as GLModel[],
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

    return api.fs.saveZipWithTxtFiles(
      {
        fileName: filename,
      } as ISaveTxt,
      files
    );
  }
}
</script>

<style scoped lang="scss"></style>
