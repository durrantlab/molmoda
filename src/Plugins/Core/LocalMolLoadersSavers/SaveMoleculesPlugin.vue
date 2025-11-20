<template>
  <PluginComponent v-model="open" :infoPayload="infoPayload" actionBtnTxt="Save" :intro="introToUse"
    @onPopupDone="onPopupDone" :prohibitCancel="appClosing" :hideIfDisabled="true" @onUserArgChanged="onUserArgChanged"
    @onMolCountsChanged="onMolCountsChanged">
  </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import { checkAnyMolLoaded } from "../../CheckUseAllowedUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
  UserArg,
  IUserArgCheckbox,
  IUserArgGroup,
  IUserArgSelect,
  IUserArgText,
  IUserArgOption,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import {
  getFormatDescriptions,
  getFormatInfoGivenType,
} from "@/FileSystem/LoadSaveMolModels/Types/MolFormats";
import { saveMolModa } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModa";
import {
  fileNameFilter,
  matchesFilename,
} from "@/FileSystem/FilenameManipulation";
import {
  compileMolModels,
  convertCompiledMolModelsToIFileInfos,
  saveMolFiles,
} from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
import {
  ICmpdNonCmpdFileInfos,
  IMolsToConsider,
} from "@/FileSystem/LoadSaveMolModels/SaveMolModels/Types";
import { TestCmdList } from "@/Testing/TestCmdList";
import { dynamicImports } from "@/Core/DynamicImports";
import { appName } from "@/Core/GlobalVars";
import { closeDownApp } from "@/Core/Utils/CloseAppUtils";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";

let lastSavedFilename: string | null = null;

// Format Options Logic ---
// Proteins: No pdbqtlig, alphabetized
const proteinOptions = getFormatDescriptions(false)
  .filter(o => o.val !== 'pdbqtlig')
  .sort((a, b) => a.description.localeCompare(b.description));

// Compounds: Formats with bond orders + specific others (pdb, pdbqtlig, xyz), alphabetized
const compoundOptions = getFormatDescriptions(true)
  .filter((option) => option.val !== "molmoda")
  .concat(getFormatDescriptions(false).filter((option) => ["pdb", "pdbqtlig", "xyz"].includes(option.val)))
  .sort((a, b) => a.description.localeCompare(b.description));

// Mixed: Union of Protein and Compound options (for Nucleic, Metals, etc.), alphabetized
const mixedOptionsMap = new Map<string, IUserArgOption>();
proteinOptions.forEach(o => mixedOptionsMap.set(o.val, o));
compoundOptions.forEach(o => mixedOptionsMap.set(o.val, o));
const mixedOptions = Array.from(mixedOptionsMap.values())
  .sort((a, b) => a.description.localeCompare(b.description));

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
  title = "Save Molecule Files";
  softwareCredits: ISoftwareCredit[] = [dynamicImports.obabelwasm.credit];
  contributorCredits: IContributorCredit[] = [
    // {
    //     name: "Jacob D. Durrant",
    //     url: "http://durrantlab.com/",
    // },
  ];
  pluginId = "savemolecules";
  intro = `Save molecules to the disk.`;
  details = `The ${appName} format (recommended) stores all molecules in one file for easy reloading. Other formats (e.g., PDB) enable compatibility with external programs.`;
  hotkey = "s";
  tags = [Tag.All];

  // If true, this plugin is being shown as part of the (terminal) app-closing
  // process.
  appClosing = false;

  userArgDefaults: UserArg[] = [
    {
      id: "filename",
      label: "",
      val: "",
      placeHolder: "Filename (e.g., my_project.molmoda)...",
      description: `The name of the molecule file to save. The file extension will be automatically appended.`,
      filterFunc: (filename: string): string => fileNameFilter(filename),
      validateFunc: (filename: string): boolean => matchesFilename(filename),
      delayBetweenChangesDetected: 0,
    } as IUserArgText,
    {
      id: "useMolModaFormat",
      label: "Save project in .molmoda format",
      val: true,
    } as IUserArgCheckbox,
    {
      id: "whichMolsGroup",
      label: "Molecules to Save",
      val: [
        {
          id: "saveVisible",
          label: "Visible molecules",
          val: false,
        } as IUserArgCheckbox,
        {
          id: "saveSelected",
          label: "Selected molecules",
          val: false,
        } as IUserArgCheckbox,
        {
          id: "saveHiddenAndUnselected",
          label: "Other molecules (hidden and unselected)",
          val: true,
        } as IUserArgCheckbox,
      ] as UserArg[],
      startOpened: true,
      enabled: false,
    } as IUserArgGroup,
    {
      id: "separateComponents",
      label: "Save components (Protein, Ligand, etc.) to separate files",
      val: true,
      enabled: false,
    } as IUserArgCheckbox,
    {
      label: "File format for merged molecules",
      id: "oneMolFileFormat",
      val: "pdb",
      options: getFormatDescriptions(false)
        .filter((option) => option.val !== "molmoda")
        .sort((a, b) => a.description.localeCompare(b.description)),
      enabled: false,
    } as IUserArgSelect,
    // Individual component formats
    {
      label: "Protein format",
      id: "proteinFormat",
      val: "pdb",
      options: proteinOptions,
      enabled: false,
    } as IUserArgSelect,
    {
      label: "Compound format",
      id: "compoundFormat",
      val: "mol2",
      options: compoundOptions,
      enabled: false,
    } as IUserArgSelect,
    {
      label: "Nucleic format",
      id: "nucleicFormat",
      val: "pdb",
      options: mixedOptions, // Protein + Compound formats
      enabled: false,
    } as IUserArgSelect,
    {
      label: "Metal format",
      id: "metalFormat",
      val: "pdb",
      options: mixedOptions, // Protein + Compound formats
      enabled: false,
    } as IUserArgSelect,
    {
      label: "Ion format",
      id: "ionFormat",
      val: "pdb",
      options: mixedOptions, // Treated same as Metal
      enabled: false,
    } as IUserArgSelect,
    {
      label: "Lipid format",
      id: "lipidFormat",
      val: "pdb",
      options: mixedOptions,
      enabled: false,
    } as IUserArgSelect,
    {
      label: "Solvent format",
      id: "solventFormat",
      val: "pdb",
      options: proteinOptions, // No pdbqtlig
      enabled: false,
    } as IUserArgSelect,
    {
      label: "Other format",
      id: "otherFormat",
      val: "pdb",
      options: mixedOptions,
      enabled: false,
    } as IUserArgSelect,
  ];

  lastFilename = "";

  /**
   * Determine which into text to use.
   *
   * @returns {string} The intro text to use.
   */
  get introToUse(): string {
    return this.appClosing ? "Be sure to save your work before closing!</p><p>" + this.intro : this.intro;

  }

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkPluginAllowed(): string | null {
    return checkAnyMolLoaded();
  }

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   *
   * @param {boolean} payload  The payload passed to the plugin.
   */
  async onBeforePopupOpen(payload?: boolean) {
    this.appClosing = payload || false;
    this.setUserArg("useMolModaFormat", true);
    this.setUserArg("saveVisible", true);
    this.setUserArg("saveSelected", true);
    this.setUserArg("saveHiddenAndUnselected", false);
    this.setUserArg("separateComponents", true);

    if (lastSavedFilename) {
      this.setUserArg("filename", lastSavedFilename);
    } else {
      const projectTitle = this.$store.state.projectTitle;
      this.setUserArg("filename", projectTitle || "");
    }
  }

  /**
   * Runs when the user presses the action button and the popup closes.
   */
  onPopupDone() {
    this.submitJobs();
  }

  /**
   * Reacts to the filename extension changing.
   */
  reactToExtChange() {
    // Now try to detect extension and open/close molmoda appropriately.
    const filename = this.getUserArg("filename");
    const ext = filename.indexOf(".") === -1 ? "" : filename.split(".").pop().toLowerCase();
    if (filename !== this.lastFilename) {
      const format = getFormatInfoGivenType(ext);
      if (format) {
        // Update all format selectors to match extension if possible
        const formatSelectors = [
          "oneMolFileFormat",
          "proteinFormat",
          "compoundFormat",
          "nucleicFormat",
          "metalFormat",
          "ionFormat",
          "lipidFormat",
          "solventFormat",
          "otherFormat"
        ];
        formatSelectors.forEach(argId => {
          const userArgDefault = this.userArgDefaults.find(a => a.id === argId);
          const opts = (userArgDefault as IUserArgSelect).options.map(o => (o as IUserArgOption).val);
          if (opts.includes(format.primaryExt)) {
            this.setUserArg(argId, format.primaryExt);
          }
        });
      }
      this.lastFilename = filename;
    }

    // this.lastUseMolModaFormat = newUseMolModa;
    // this.setUserArg("useMolModaFormat", newUseMolModa);

    // return newUseMolModa;
  }

  /**
   * Detects when user arguments have changed, and updates UI accordingly.
   */
  onUserArgChange() {
    this.reactToExtChange();

    const useMolModa = this.getUserArg("useMolModaFormat") as boolean;
    const separateComponents = this.getUserArg("separateComponents") as boolean;
    const saveHiddenAndUnselected = this.getUserArg("saveHiddenAndUnselected") as boolean;
    const saveVisible = this.getUserArg("saveVisible") as boolean;
    const saveSelected = this.getUserArg("saveSelected") as boolean;

    this.setUserArgEnabled("whichMolsGroup", !useMolModa);
    this.setUserArgEnabled("separateComponents", !useMolModa);
    this.setUserArgEnabled("oneMolFileFormat", !separateComponents && !useMolModa);

    // Check which components are present in the selection to enable specific format dropdowns
    const componentTypes = new Set<TreeNodeType>();
    if (!useMolModa && separateComponents) {
      const allMols = getMoleculesFromStore();
      const molsToConsider = {
        visible: saveVisible,
        selected: saveSelected,
        hiddenAndUnselected: saveHiddenAndUnselected,
      };
      // Helper to check if a node should be considered
      const shouldConsider = (node: any) => {
        return (node.selected !== 'false' && molsToConsider.selected) ||
          (node.visible && molsToConsider.visible) ||
          (!node.visible && node.selected === 'false' && molsToConsider.hiddenAndUnselected);
      };

      // Iterate flattened list to find types
      // Optimization: Just check all terminals if we are considering everything
      const nodesToCheck = allMols.filters.onlyTerminal;
      nodesToCheck.forEach(node => {
        // We need to check if this node is included. 
        // If we are selecting by molecule, we need to check ancestors.
        // But simple check: is the node or its top-level parent selected/visible?
        // Let's simplify: if `saveHiddenAndUnselected` is true, ALL types present exist.
        // Otherwise, check individual nodes.
        if (shouldConsider(node)) {
          if (node.type) componentTypes.add(node.type);
          else componentTypes.add(TreeNodeType.Other);
        }
      });
    }

    const typeToArgId: { [key in TreeNodeType]?: string } = {
      [TreeNodeType.Protein]: "proteinFormat",
      [TreeNodeType.Compound]: "compoundFormat",
      [TreeNodeType.Nucleic]: "nucleicFormat",
      [TreeNodeType.Metal]: "metalFormat",
      [TreeNodeType.Solvent]: "solventFormat",
      [TreeNodeType.Other]: "otherFormat",
      [TreeNodeType.Lipid]: "lipidFormat",
      [TreeNodeType.Ions]: "ionFormat",
      // Regions aren't usually saved this way but included for completeness
      [TreeNodeType.Region]: undefined
    };

    for (const type of Object.values(TreeNodeType)) {
      const argId = typeToArgId[type];
      if (argId) {
        const isPresent = componentTypes.has(type);
        this.setUserArgEnabled(argId, separateComponents && !useMolModa && isPresent);
      }
    }
    // Always enable otherFormat if separating, just in case? No, rely on detection.
  }

  async runJobInBrowser(): Promise<void> {
    let filename = this.getUserArg("filename");
    lastSavedFilename = filename;
    const useMolModaFormat = this.getUserArg("useMolModaFormat") as boolean;

    if (useMolModaFormat) {
      if (!filename.toLowerCase().endsWith(".molmoda")) {
        filename += ".molmoda";
      }
      await saveMolModa(filename);
      if (this.appClosing) closeDownApp("Your file has been saved. ");
      return;
    }

    const separateComponents = this.getUserArg("separateComponents") as boolean;
    const oneMolFileFormat = this.getUserArg("oneMolFileFormat");

    const formats: { [key in TreeNodeType]?: string } = {};
    if (separateComponents) {
      formats[TreeNodeType.Protein] = this.getUserArg("proteinFormat");
      formats[TreeNodeType.Compound] = this.getUserArg("compoundFormat");
      formats[TreeNodeType.Nucleic] = this.getUserArg("nucleicFormat");
      formats[TreeNodeType.Metal] = this.getUserArg("metalFormat");
      formats[TreeNodeType.Ions] = this.getUserArg("ionFormat");
      formats[TreeNodeType.Solvent] = this.getUserArg("solventFormat");
      formats[TreeNodeType.Other] = this.getUserArg("otherFormat");
      formats[TreeNodeType.Lipid] = this.getUserArg("lipidFormat");
    }

    const molsToConsider = {
      visible: this.getUserArg("saveVisible"),
      selected: this.getUserArg("saveSelected"),
      hiddenAndUnselected: this.getUserArg("saveHiddenAndUnselected"),
    } as IMolsToConsider;

    const compiledMolModels = compileMolModels(molsToConsider, separateComponents);

    return convertCompiledMolModelsToIFileInfos(
      compiledMolModels,
      formats,
      oneMolFileFormat
    ).then((infos: ICmpdNonCmpdFileInfos) => {
      return saveMolFiles(filename, infos);
    });
  }

  async getTests(): Promise<ITest[]> {
    const molModaJob: ITest = {
      beforePluginOpens: () => new TestCmdList().loadExampleMolecule(true).selectMoleculeInTree("Protein"),
      pluginOpen: () => new TestCmdList().setUserArg("filename", "test", this.pluginId),
      afterPluginCloses: () => new TestCmdList().waitUntilRegex("#log", "Job savemolecules.*? ended"),
    };
    const jobs: ITest[] = [molModaJob];
    let idx = 0;
    for (const toConsider of [
      // visible, selected, hiddenAndUnselected checkboxes
      [true, false, false],
      [false, true, false],
      [true, true, false],
      [true, true, true],
    ]) {
      // Unpack as visible, selected, hiddenAndUnselected
      const [visible, selected, hiddenAndUnselected] = toConsider;
      idx++;
      const pluginOpenCmdList = new TestCmdList()
        .setUserArg("filename", "test", this.pluginId)
        .click("#modal-savemolecules #useMolModaFormat-savemolecules-item");
      if (visible === false) {
        // True by default, so must click
        pluginOpenCmdList.click(
          "#modal-savemolecules #saveVisible-savemolecules-item"
        );
      }
      if (selected === false) {
        // True by default, so must click
        pluginOpenCmdList.click(
          "#modal-savemolecules #saveSelected-savemolecules-item"
        );
      }
      if (hiddenAndUnselected === true) {
        // False by default, so must click
        pluginOpenCmdList.click(
          "#modal-savemolecules #saveHiddenAndUnselected-savemolecules-item"
        );
      }
      // Test separation toggle roughly half the time, but ensure valid state
      if (idx % 2 === 0) {
        // Toggle separation off (default is true in the new logic when not using molmoda)
        pluginOpenCmdList.click(
          "#modal-savemolecules #separateComponents-savemolecules-item"
        );
      }
      jobs.push({
        ...molModaJob,
        pluginOpen: () => pluginOpenCmdList,
      });
    }
    const reuseFilenameTest: ITest = {
      name: "Reuse Last Saved Filename",
      beforePluginOpens: () =>
        new TestCmdList()
          .loadExampleMolecule(true) // 1. Load something to save.
          .openPlugin("savemolecules") // 2. Open save plugin for the first time.
          .setUserArg("filename", "my-reused-project-name", this.pluginId) // 3. Set a filename.
          .pressPopupButton(".action-btn", this.pluginId) // 4. "Save" it. This also closes the popup.
          .waitUntilRegex("#log", "Job savemolecules.*? ended"), // 5. Wait for save to complete.
      // The test runner opens the plugin again here. `onBeforePopupOpen` should pre-fill the filename.
      pluginOpen: () =>
        new TestCmdList()
          // 6. Check if the input field has the reused name.
          // This relies on the test runner's ability to read the `value` of an input field.
          .waitUntilRegex(
            "#filename-savemolecules-item",
            "my-reused-project-name"
          ),
      // No action needed in closePlugin as we're just verifying the state on open.
      closePlugin: () =>
        new TestCmdList().pressPopupButton(".cancel-btn", this.pluginId),
      afterPluginCloses: () => new TestCmdList(),
    };
    jobs.push(reuseFilenameTest);

    // New test for component separation
    jobs.push({
      name: "Save Components Separately",
      beforePluginOpens: () => new TestCmdList().loadExampleMolecule(true),
      pluginOpen: () => new TestCmdList()
        .setUserArg("filename", "split_test", this.pluginId)
        .click("#modal-savemolecules #useMolModaFormat-savemolecules-item"), // Uncheck molmoda, separation is default
      afterPluginCloses: () => new TestCmdList().waitUntilRegex("#log", "Job savemolecules.*? ended"),
    });

    return jobs;
  }
}
</script>

<style scoped lang="scss"></style>
