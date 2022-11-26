<template>
  <PluginComponent
    :userArgs="userArgs"
    v-model="open"
    title="Load PDB ID"
    actionBtnTxt="Load"
    :intro="intro"
    :pluginId="pluginId"
    @onPopupDone="onPopupDone"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { loadRemote } from "./Utils";
import * as api from "@/Api";
import { PluginParentClass, RunJobReturn } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement, IFormText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { ITest } from "@/Testing/ParentPluginTestFuncs";
import { IFileInfo } from "@/FileSystem/Types";

/**
 * LoadPDBPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class LoadPDBPlugin extends PluginParentClass {
  menuPath = "File/[1] Remote Import/[2] PDB ID";
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

  hotkey = "d"

  userArgs: FormElement[] = [
    {
      id: "pdbId",
      label: "",
      val: "",
      placeHolder: "Enter PDB ID (e.g., 1XDN)",
      filterFunc: (pdb: string): string => {
        pdb = pdb.toUpperCase();
        pdb = pdb.replace(/[^A-Z\d]/g, ""); // Only nums and lets
        pdb = pdb.substring(0, 4);
        return pdb;
      },
      validateFunc: (pdb: string): boolean => {
        return pdb.length === 4;
      },
    } as IFormText,
  ];

  alwaysEnabled = true;

  /**
   * Runs when the user presses the action button and the popup closes.
   *
   * @param {IUserArg[]} userArgs  The user arguments.
   */
  onPopupDone(userArgs: IUserArg[]) {
    const pdbId = this.getArg(userArgs, "pdbId");
    this.submitJobs([pdbId]);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {string} pdbId  The PDB ID to load.
   * @returns {RunJobReturn}  A promise that resolves the file object.
   */
  runJobInBrowser(pdbId: string): RunJobReturn {
    return loadRemote(
      `https://files.rcsb.org/view/${pdbId.toUpperCase()}.pdb`
    )
      .then((fileInfo: IFileInfo): any => {
        return fileInfo;
      })
      .catch((err: string) => {
        // TODO: Check if CIF exists?
        api.messages.popupError(err);
      });
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
      pluginOpen: [this.testSetUserArg("pdbId", "1XDN")],
      afterPluginCloses: [
        this.testWaitForRegex("#styles", "Protein"),
        this.testWaitForRegex("#log", 'Job "loadpdb:.+?" ended'),
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
