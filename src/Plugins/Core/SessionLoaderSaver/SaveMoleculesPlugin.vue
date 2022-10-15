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
    :prohibitCancel="windowClosing"
    @onDataChanged="onDataChanged"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import { saveState, setStoreIsDirty } from "@/Store/LoadAndSaveStore";
import {
  fileNameFilter,
  getFileNameParts,
  matchesFilename,
} from "@/FileSystem/Utils";
import * as api from "@/Api";
import { checkanyMolLoaded } from "../CheckUseAllowedUtils";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
  FormElement,
  IFormCheckbox,
  IFormSelect,
  IFormText,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { ITest } from "@/Testing/ParentPluginTestFuncs";
import {
  getFormatDescriptions,
  getFormatInfoGivenExt,
  IFormatInfo,
} from "@/FileSystem/LoadSaveMolModels/Definitions/MolFormats";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import { convertMolContainer } from "@/FileSystem/LoadSaveMolModels/ConvertMolModels/ConvertMolContainer";
import { ISaveTxt } from "@/Core/FS";
import { IAtom, IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { slugify } from "@/Core/Utils";

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

  intro = `Please provide the name of the molecule file to save. Note that the
      file extension will be automatically appended.`;

  windowClosing = false;

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
      label: "Use .biotite format to save entire project?",
      val: true,
    } as IFormCheckbox,
    {
      label: "File format for compounds (e.g., small molecules):",
      id: "compoundFormat",
      val: "mol2",
      options: getFormatDescriptions(true),
      enabled: false,
    } as IFormSelect,
    {
      label: "File format for other molecules (e.g., proteins):",
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

    if (this.windowClosing) {
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
    this.windowClosing = this.payload !== undefined;
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

  onDataChanged(userArgs: IUserArg[]) {
    this.updateUserArgEnabled("compoundFormat", !userArgs[1].val);
    this.updateUserArgEnabled("proteinFormat", !userArgs[1].val);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IUserArg[]} userArgs  Information about the file to save.
   * @returns {Promise<undefined>}  A promise that resolves when the job is
   *     done.
   */
  runJob(userArgs: IUserArg[]): Promise<undefined> {
    let filename = userArgs[0].val;
    let useBiotiteFormat = userArgs[1].val;

    if (useBiotiteFormat) {
      return this.runJobBiotite(filename);
    } else {
      let compoundFormat = userArgs[2].val;
      let proteinFormat = userArgs[3].val;

      return this.runJobNotBiotite(filename, compoundFormat, proteinFormat);
    }
  }

  runJobBiotite(filename: string): Promise<undefined> {
    // Add .biotite to end if not already there
    if (!filename.endsWith(".biotite")) {
      filename += ".biotite";
    }

    return saveState(filename, this.$store.state)
      .then(() => {
        setStoreIsDirty(false);
        if (this.windowClosing) {
          api.messages.popupMessage(
            "Session Ended",
            "Your file has been saved. You may now close/reload this tab/window.",
            PopupVariant.INFO,
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

  runJobNotBiotite(
    filename: string,
    compoundFormat: string,
    proteinFormat: string
  ): Promise<undefined> {
    // Not using biotite format. Create ZIP file with protein and small
    // molecules.
    let compoundFormatInfo = getFormatInfoGivenExt(
      compoundFormat
    ) as IFormatInfo;
    let proteinFormatInfo = getFormatInfoGivenExt(proteinFormat) as IFormatInfo;
    let compoundExt = compoundFormatInfo.primaryExt;
    let proteinExt = proteinFormatInfo.primaryExt;

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

    let compoundTxtsPromises = convertMolContainer(
      compoundNodes,
      compoundExt,
      false // Never merge compounds
    ).then((compoundTxts: string[]) => {
      return compoundTxts.map((txt, idx) => {
        // Prepend the chain
        let molEntry = compoundNodes[idx];

        return {
          fileName: this._getFilename(molEntry, compoundExt),
          content: txt,
          ext: `.${compoundExt}`,
        } as ISaveTxt;
      });
    });

    let nonCompoundTxtsPromises = convertMolContainer(
      nonCompoundNodes,
      proteinExt,
      mergeNonCompounds
    ).then((nonCompoundTxts: string[]) => {
      return nonCompoundTxts.map((txt, idx) => {
        return {
          fileName: this._getFilename(nonCompoundNodes[idx], proteinExt),
          content: txt,
          ext: `.${proteinExt}`,
        } as ISaveTxt;
      });
    });

    return Promise.all([compoundTxtsPromises, nonCompoundTxtsPromises])
      .then((txts: ISaveTxt[][]) => {
        return txts[0].concat(txts[1]);
      })
      .then((files: ISaveTxt[]) => {
        return api.fs.saveZipWithTxtFiles(
          {
            fileName: filename,
          } as ISaveTxt,
          files
        );
      });
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
