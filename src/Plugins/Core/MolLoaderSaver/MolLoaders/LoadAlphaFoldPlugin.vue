<template>
  <PluginComponent
    :userInputs="userInputs"
    v-model="open"
    title="Load AlphaFold Structure"
    actionBtnTxt="Load"
    :intro="intro"
    @onPopupDone="onPopupDone"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { loadMoleculeFile } from "@/FileSystem/LoadMoleculeFiles";
import { IFileInfo } from "@/FileSystem/Interfaces";
import { loadRemote } from "./Utils";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import * as api from "@/Api";
import { FormElement, IFormText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";

/**
 * LoadAlphaFoldPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class LoadAlphaFoldPlugin extends PluginParentClass {
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

  userInputs: FormElement[] = [
    {
      id: "uniprot",
      label: "",
      val: "",
      placeHolder: "Enter UniProt Accession (e.g., P86927)",
      filterFunc: (uniprot: string): string => {
        // https://www.uniprot.org/help/accession_numbers
        uniprot = uniprot.toUpperCase();
        uniprot = uniprot.replace(/[^A-Z\d]/g, "");
        uniprot = uniprot.substring(0, 10);
        return uniprot;
      },
      validateFunc: (uniprot: string): boolean => {
        // https://www.uniprot.org/help/accession_numbers
        let r = /[OPQ]\d[A-Z\d]{3}\d|[A-NR-Z]\d([A-Z][A-Z\d]{2}\d){1,2}/;
        return uniprot.match(r) !== null;
      },
    } as IFormText,
  ];

  /**
   * Runs when the user presses the action button and the popup closes.
   *
   * @param {IUserArg[]} userParams  The user arguments.
   */
  onPopupDone(userParams: IUserArg[]) {
    loadRemote(
      `https://alphafold.ebi.ac.uk/api/prediction/${userParams[0].val.toUpperCase()}`
    )
      .then((fileInfo: IFileInfo) => {
        let json = JSON.parse(fileInfo.contents);
        let pdbUrl = json[0]["pdbUrl"]; // TODO: When would there be more than one entry?
        if (pdbUrl) {
          // Load the PDB file.
          return loadRemote(pdbUrl);
        }
        // Throw error
        throw new Error("No PDB file found.");
      })
      .then((fileInf: IFileInfo): void => {
        this.submitJobs([fileInf]);
        return;
      })
      .catch((err: string) => {
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

<style scoped lang="scss"></style>
