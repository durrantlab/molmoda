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
  >
  </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import * as api from "@/Api";
import { checkanyMolLoaded } from "../CheckUseAllowedUtils";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import {
  PluginParentClass,
  RunJobReturn,
} from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
  FormElement,
  IFormCheckbox,
  IFormGroup,
  IFormSelect,
  IFormText,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { ITest } from "@/Testing/ParentPluginTestFuncs";
import { getFormatDescriptions } from "@/FileSystem/LoadSaveMolModels/Types/MolFormats";
import { saveBiotite } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveBiotite";
import {
  fileNameFilter,
  matchesFilename,
} from "@/FileSystem/FilenameManipulation";
import { dynamicImports } from "@/Core/DynamicImports";
import {
  compileMolModels,
  convertCompiledMolModelsToIFileInfos,
  IMolsToConsider,
  MolMergeStrategy,
  saveMolFiles,
} from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
import { MolsToConsiderStr } from "@/UI/Forms/MoleculeInputParams/Types";
import { IFileInfo } from "@/FileSystem/Types";

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

  hotkey = "s";

  // If true, this plugin is being shown as part of the (terminal) app-closing
  // process.
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
      id: "useBiotiteFormat",
      label: "Save project in .biotite format",
      val: true,
    } as IFormCheckbox,
    // {
    //   id: "molSavingGroup",
    //   label: "File Contents",
    //   childElements: [

    //     {
    //       id: "mergeAllMolecules",
    //       label: "Each molecule in a seprate file",
    //       val: false,
    //     } as IFormCheckbox,
    //   ] as FormElement[],
    //   startOpened: true,
    //   enabled: false,
    // } as IFormGroup,
    {
      id: "whichMolsGroup",
      label: "Molecules to Save",
      childElements: [
        {
          id: "saveAllMols",
          label: "All molecules",
          val: true,
        } as IFormCheckbox,
        {
          id: "saveVisible",
          label: "Visible molecules",
          val: false,
        } as IFormCheckbox,
        {
          id: "saveSelected",
          label: "Selected molecules",
          val: false,
        } as IFormCheckbox,
      ] as FormElement[],
      startOpened: true,
      enabled: false,
    } as IFormGroup,
    {
      id: "separateCompounds",
      label: "Save each small-molecule compound to a separate file",
      val: true,
      enabled: false
    } as IFormCheckbox,
    // {
    //   id: "molMergeStrategy",
    //   label: "File format",
    //   val: "biotite",
    //   options: [
    //     {
    //       val: "biotite",
    //       description: ".biotite (entire project)",
    //     },
    //     {
    //       val: MolMergeStrategy.OneMol,
    //       description: "Single file",
    //     },
    //     {
    //       val: MolMergeStrategy.ByMolecule,
    //       description: "Separate files, receptors/ligands",
    //     },
    //     // By chain now depreciated.
    //     // {
    //     //   val: MolMergeStrategy.ByChain,
    //     //   description: "Separate files, receptor/ligand chains",
    //     // },
    //   ],
    // } as IFormSelect,
    // {
    //   label: "Molecules to save",
    //   id: "whichMols",
    //   val: MolsToConsiderStr.All,
    //   options: molsToConsiderOptions,
    //   enabled: false,
    // } as IFormSelect,
    {
      label: "File format",
      id: "oneMolFileFormat",
      val: "pdb",
      options: getFormatDescriptions(false).filter(
        (option) => option.val !== "biotite"
      ),
      enabled: false,
    } as IFormSelect,
    {
      label: "File format",
      id: "nonCompoundFormat",
      val: "pdb",
      options: getFormatDescriptions(false),
      enabled: false,
    } as IFormSelect,
    {
      label: "File format for separate small-molecule compounds",
      id: "compoundFormat",
      val: "mol2",
      options: getFormatDescriptions(true).filter(
        (option) => option.val !== "biotite"
      ),
      enabled: false,
    } as IFormSelect,
  ];

  alwaysEnabled = true;
  // formatWarningMsg = "";

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
    // Good chance you'll need open babel, so start loading now.
    dynamicImports.openbabeljs.module;

    this.appClosing = this.payload !== undefined;

    // Reset some form values
    this.updateUserArgs([
      // {
      //   name: "molMergeStrategy",
      //   val: "biotite",
      // },
      {
        name: "useBiotiteFormat",
        val: true,
      },
      {
        name: "saveAllMols",
        val: true,
      },
      {
        name: "separateCompounds",
        val: true,
      },
    ]);
    // this.updateUserArgEnabled("molMergeStrategy", !this.appClosing);

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
    let useBiotite = this.getArg(userArgs, "useBiotiteFormat") as boolean;
    // this.updateUserArgEnabled("molMergingGroup", !useBiotite);
    this.updateUserArgEnabled("whichMolsGroup", !useBiotite);
    this.updateUserArgEnabled("separateCompounds", !useBiotite);
    

    let saveAllMols = this.getArg(userArgs, "saveAllMols") as boolean;
    this.updateUserArgEnabled("saveVisible", !saveAllMols && !useBiotite);
    this.updateUserArgEnabled("saveSelected", !saveAllMols && !useBiotite);

    if (saveAllMols) {
      // If saving all, make sure the other two are unchecked.
      this.updateUserArgs([
        {
          name: "saveVisible",
          val: false,
        },
        {
          name: "saveSelected",
          val: false,
        },
      ]);
    } else {
      // At least one of the other two must be checked. Let's just check them
      // both.
      let saveVisible = this.getArg(userArgs, "saveVisible") as boolean;
      let saveSelected = this.getArg(userArgs, "saveSelected") as boolean;
      if (!saveVisible) {
        this.updateUserArgs([
          {
            name: "saveSelected",
            val: true,
          },
        ]);
      }
      // TODO: Below doesn't always work. See TODO.md.
      if (!saveSelected) {
        this.updateUserArgs([
          {
            name: "saveVisible",
            val: true,
          },
        ]);
      }
    }

    // Show onemol format or protein format, depending on whether
    // mergeAllMolecules is true.
    let mergeAllMolecules = this.getArg(
      userArgs,
      "mergeAllMolecules"
    ) as boolean;
    this.updateUserArgEnabled("oneMolFileFormat", mergeAllMolecules && !useBiotite);
    this.updateUserArgEnabled("nonCompoundFormat", !mergeAllMolecules && !useBiotite);

    // If separating out compounds, show compound format.
    let separateCompounds = this.getArg(
      userArgs,
      "separateCompounds"
    ) as boolean;
    this.updateUserArgEnabled("compoundFormat", separateCompounds && !useBiotite);

    // let molMergeStrategy = this.getArg(userArgs, "molMergeStrategy");

    // this.updateUserArgEnabled("whichMols", molMergeStrategy !== "biotite");

    // let showSeparateFormats =
    //   [MolMergeStrategy.ByMolecule, MolMergeStrategy.ByChain].indexOf(
    //     molMergeStrategy
    //   ) !== -1;

    // this.updateUserArgEnabled("compoundFormat", showSeparateFormats);
    // this.updateUserArgEnabled("nonCompoundFormat", showSeparateFormats);

    // this.updateUserArgEnabled(
    //   "oneMolFileFormat",
    //   molMergeStrategy === MolMergeStrategy.OneMol
    // );

    // let formatWarningMsgs: string[] = [];

    // if (showSeparateFormats) {
    //   const compoundFormat = this.userArgsLookup(userArgs, "compoundFormat");
    //   const nonCompoundFormat = this.userArgsLookup(userArgs, "nonCompoundFormat");

    //   let compoundFormatInfo = getFormatInfoGivenType(compoundFormat);
    //   let proteinFormatInfo = getFormatInfoGivenType(nonCompoundFormat);

    //   if (
    //     compoundFormatInfo !== undefined &&
    //     compoundFormatInfo?.saveWarning !== undefined
    //   ) {
    //     formatWarningMsgs.push(compoundFormatInfo.saveWarning);
    //   }
    //   if (
    //     proteinFormatInfo !== undefined &&
    //     proteinFormatInfo?.saveWarning !== undefined
    //   ) {
    //     formatWarningMsgs.push(proteinFormatInfo.saveWarning);
    //   }
    // } else {
    //   const oneMolFileFormat = this.userArgsLookup(
    //     userArgs,
    //     "oneMolFileFormat"
    //   );
    //   let oneMolFileFormatInfo = getFormatInfoGivenType(oneMolFileFormat);

    //   if (
    //     oneMolFileFormatInfo !== undefined &&
    //     oneMolFileFormatInfo?.saveWarning !== undefined
    //   ) {
    //     formatWarningMsgs.push(oneMolFileFormatInfo.saveWarning);
    //   }
    // }

    // // Keep only unique items in formatWarningMsgs
    // formatWarningMsgs = [...new Set(formatWarningMsgs)];
    // this.formatWarningMsg = formatWarningMsgs.join("\n");
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IUserArg[]} userArgs  Information about the file to save.
   * @returns {RunJobReturn}  A promise that resolves when the job is
   *     done.
   */
  runJobInBrowser(userArgs: IUserArg[]): RunJobReturn {
    const filename = this.getArg(userArgs, "filename");
    // const molMergeStrategy = this.getArg(userArgs, "molMergeStrategy") as
    //   | string
    //   | MolMergeStrategy;
    // const whichMols = this.getArg(userArgs, "whichMols") as MolsToConsiderStr;
    const useBiotiteFormat = this.getArg(
      userArgs,
      "useBiotiteFormat"
    ) as boolean;
    let compoundFormat = this.getArg(userArgs, "compoundFormat");
    let nonCompoundFormat = this.getArg(userArgs, "nonCompoundFormat");
    const oneMolFileFormat = this.getArg(userArgs, "oneMolFileFormat");
    const separateCompounds = this.getArg(
      userArgs,
      "separateCompounds"
    ) as boolean;
    const mergeAllMolecules = this.getArg(
      userArgs,
      "mergeAllMolecules"
    ) as boolean;
    const saveAllMols = this.getArg(userArgs, "saveAllMols") as boolean;
    const saveVisible = this.getArg(userArgs, "saveVisible") as boolean;
    const saveSelected = this.getArg(userArgs, "saveSelected") as boolean;

    if (useBiotiteFormat) {
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
          return;
        })
        .catch((err: any) => {
          console.log(err);
          return;
        });
    }

    // Not biotite. Determine combine mol strategy.
    // let molMergeStrategy: MolMergeStrategy | undefined = (
    //   {
    //     single: MolMergeStrategy.OneMol,
    //     separate: MolMergeStrategy.ByMolecule,
    //   } as any
    // )[molMergeStrategy];
    // molMergeStrategy = molMergeStrategy ?? MolMergeStrategy.ByChain;

    // NOTE: By chain not supported. Just use extract.
    const molMergeStrategy = mergeAllMolecules
      ? MolMergeStrategy.OneMol
      : MolMergeStrategy.ByMolecule;

    // If saving to a single molecule and not separating out compounds,
    // compoundFormat and nonCompoundFormat should be the same.
    if (
      molMergeStrategy === MolMergeStrategy.OneMol &&
      separateCompounds === false
    ) {
      compoundFormat = oneMolFileFormat;
      nonCompoundFormat = oneMolFileFormat;
    }

    let molsToConsider: IMolsToConsider;
    if (saveAllMols === true) {
      molsToConsider = {
        all: true,
      };
    } else {
      molsToConsider = {
        visible: saveVisible,
        selected: saveSelected,
      };
    }

    // Divide terminal nodes into compound and non-compound, per the merge
    // strategy and mols to consider.
    const compiledMolModels = compileMolModels(
      molMergeStrategy as MolMergeStrategy,
      molsToConsider,
      separateCompounds
    );

    // Perform any file conversion needed
    convertCompiledMolModelsToIFileInfos(
      compiledMolModels,
      compoundFormat,
      nonCompoundFormat,
      molMergeStrategy === MolMergeStrategy.OneMol,
      filename
    )
      .then((fileInfos: IFileInfo[]) => {
        // Now save the molecules
        saveMolFiles(filename, fileInfos);
        return;
      })
      .catch((err: any) => {
        console.log(err);
        return;
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
