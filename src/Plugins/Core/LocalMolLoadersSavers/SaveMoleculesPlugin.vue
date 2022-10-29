<template>
  <PluginComponent
    ref="pluginComponent"
    :userArgs="userArgs"
    v-model="open"
    title="Save Molecule Files"
    actionBtnTxt="Save"
    :intro="introToUse"
    :pluginId="pluginId"
    @onPopupDone="onPopupDone"
    :prohibitCancel="appClosing"
    @onDataChanged="onDataChanged"
    :hideIfDisabled="true"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import { fileNameFilter, matchesFilename } from "@/FileSystem/Utils";
import * as api from "@/Api";
import { checkanyMolLoaded } from "../CheckUseAllowedUtils";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
  FormElement,
  IFormSelect,
  IFormText,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { ITest } from "@/Testing/ParentPluginTestFuncs";
import { getFormatDescriptions } from "@/FileSystem/LoadSaveMolModels/Definitions/MolFormats";
import {
  MolsToUse,
  molsToUseOptions,
} from "@/UI/Forms/MoleculeInputParams/Definitions";
import { saveAll } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveAll";
import { saveByChain } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveByChain";
import { saveByMolecule } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveByMolecule";
import { saveBiotite } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveBiotite";

/**
 * SaveMoleculesPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class SaveMoleculesPlugin extends PluginParentClass {
  menuPath = "File/Project/[1] Save...";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "savemolecules";

  intro = `Please provide the name of the molecule file to save. The
      file extension will be automatically appended.`;

  appClosing = false;

  userArgs: FormElement[] = [
    {
      id: "filename",
      label: "",
      val: "",
      placeHolder: "Enter Filename (e.g., my_project.biotite)",
      filterFunc: (filename: string): string => {
        return fileNameFilter(filename);
      },
      validateFunc: (filename: string): boolean => {
        return matchesFilename(filename);
      },
    } as IFormText,
    {
      id: "saveFormat",
      label: "File format",
      val: "biotite",
      options: [
        {
          val: "biotite",
          description: ".biotite (entire project)",
        },
        {
          val: "single",
          description: "Single file",
        },
        {
          val: "separate",
          description: "Separate files, receptors/ligands",
        },
        {
          val: "separate-chains",
          description: "Separate files, receptor/ligand chains",
        },
      ],
    } as IFormSelect,
    {
      label: "Molecules to save",
      id: "molsToSave",
      val: MolsToUse.All.toString(),
      options: molsToUseOptions,
      enabled: false,
    } as IFormSelect,
    {
      label: "File format",
      id: "singleFileFormat",
      val: "pdb",
      options: getFormatDescriptions(false).filter(
        (option) => option.val !== "biotite"
      ),
      enabled: false,
    } as IFormSelect,
    {
      label: "File format for compounds (e.g., small molecules)",
      id: "compoundFormat",
      val: "mol2",
      options: getFormatDescriptions(true).filter(
        (option) => option.val !== "biotite"
      ),
      enabled: false,
    } as IFormSelect,
    {
      label: "File format for other molecules (e.g., proteins)",
      id: "proteinFormat",
      val: "pdb",
      options: getFormatDescriptions(false),
      enabled: false,
    } as IFormSelect,
  ];

  alwaysEnabled = true;

  /**
   * Determine which into text to use.
   *
   * @returns {string} The intro text to use.
   */
  get introToUse(): string {
    let i = "";

    if (this.appClosing) {
      i += "Be sure to save your work before closing!</p><p>";
    }

    i += this.intro;

    return i;
  }

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkPluginAllowed(): string | null {
    return checkanyMolLoaded(this);
  }

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   */
  onBeforePopupOpen() {
    this.appClosing = this.payload !== undefined;
    this.payload = undefined;
  }

  /**
   * Runs when the user presses the action button and the popup closes.
   *
   * @param {IUserArg[]} userArgs  The user arguments.
   */
  onPopupDone(userArgs: IUserArg[]) {
    this.submitJobs([userArgs]);
  }

  /**
   * Detects when user arguments have changed, and updates UI accordingly.
   *
   * @param {userArgs[]} userArgs  The updated user arguments.
   */
  onDataChanged(userArgs: IUserArg[]) {
    let saveFormat = this.userArgsLookup(userArgs, "saveFormat");

    this.updateUserArgEnabled("molsToSave", saveFormat !== "biotite");

    let showSeparateFormats =
      ["separate", "separate-chains"].indexOf(saveFormat) !== -1;

    this.updateUserArgEnabled("compoundFormat", showSeparateFormats);
    this.updateUserArgEnabled("proteinFormat", showSeparateFormats);

    this.updateUserArgEnabled("singleFileFormat", saveFormat === "single");
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IUserArg[]} userArgs  Information about the file to save.
   * @returns {Promise<undefined>}  A promise that resolves when the job is
   *     done.
   */
  runJobInBrowser(userArgs: IUserArg[]): Promise<undefined> {
    const filename = this.userArgsLookup(userArgs, "filename");
    const saveFormat = this.userArgsLookup(userArgs, "saveFormat");
    const molsToSave = parseInt(
      this.userArgsLookup(userArgs, "molsToSave"),
      10
    );
    const compoundFormat = this.userArgsLookup(userArgs, "compoundFormat");
    const proteinFormat = this.userArgsLookup(userArgs, "proteinFormat");
    const singleFileFormat = this.userArgsLookup(userArgs, "singleFileFormat");

    switch (saveFormat) {
      case "biotite": {
        return saveBiotite(filename)
          .then(() => {
            if (this.appClosing) {
              api.messages.popupMessage(
                "Session Ended",
                "Your file has been saved. You may now close/reload this tab/window.",
                PopupVariant.Info,
                () => {
                  // Reload the page
                  window.location.reload();
                }
              );
            }
            return undefined;
          })
          .catch((err: any) => {
            console.log(err);
            return undefined;
          });
      }
      case "single": {
        return saveAll(filename, molsToSave, singleFileFormat);
      }
      case "separate": {
        return saveByMolecule(filename, molsToSave, compoundFormat, proteinFormat);
      }
      default: {
        // By chain is only one left.
        return saveByChain(filename, molsToSave, compoundFormat, proteinFormat);
      }
    }
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
      beforePluginOpens: [this.testLoadExampleProtein()],
      populateUserArgs: [this.testUserArg("filename", "test")],
      afterPluginCloses: [
        this.testWaitForRegex("#log", 'Job "savemolecules:.+?" ended'),
        this.testWait(3),
      ],
    };
  }
}
</script>

<style scoped lang="scss"></style>
