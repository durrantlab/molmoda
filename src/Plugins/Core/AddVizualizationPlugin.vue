<template>
  <PluginComponent v-model="open" :infoPayload="infoPayload" :actionBtnTxt="dynamicActionBtnTxt"
    @onPopupDone="onPopupDone" @onUserArgChanged="onUserArgChanged" :isActionBtnEnabled="isActionBtnEnabled"
    @onMolCountsChanged="onMolCountsChanged" :hideIfDisabled="true">
    <template #afterForm>
      <div v-if="currentSelectionRepType" class="mt-3">
        <FormWrapper label="Color Scheme" cls="border-0">
          <ColorSchemeSelect :key="currentSelectionRepType" v-model="currentRepresentationStyle"
            :repName="currentSelectionRepType" :molType="treeNodeTypeForColorSchemes" @onChange="onColorSchemeChange"
            :excludeSchemeNames="['Molecule', 'Chain']" cls="" />
          <FormElementDescription description="Choose the coloring method for the selected representation." />
        </FormWrapper>
      </div>
    </template>
  </PluginComponent>
</template>
<script lang="ts">
import { Options } from "vue-class-component";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import {
  IUserArgText,
  UserArg,
  UserArgType,
  IUserArgSelect,
  IUserArgOption,
  IUserArgListSelect,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import {
  ISoftwareCredit,
  IContributorCredit,
} from "@/Plugins/PluginInterfaces";
import {
  ISelAndStyle,
  AtomsRepresentation,
  BackBoneRepresentation,
  SurfaceRepresentation,
  Representation,
} from "@/Core/Styling/SelAndStyleInterfaces";
import * as StyleManager from "@/Core/Styling/StyleManager";
import ColorSchemeSelect from "@/UI/Panels/Options/Styles/ColorSchemeSelect.vue";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { messagesApi } from "@/Api/Messages";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import FormElementDescription from "@/UI/Forms/FormElementDescription.vue";
import { FailingTest } from "@/Testing/FailingTest";
import { getUniqueResiduesFromVisibleMolecules } from "@/UI/Navigation/TreeView/TreeUtils";
import { Watch } from "vue-property-decorator";
// import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
// import { IColorScheme } from "@/Core/Styling/Colors/ColorInterfaces"; // Potentially needed

interface AddVizPayload {
  styleNameToEdit?: string;
}

/**
 * Payload for programmatic execution of AddVizualizationPlugin.
 */
interface ProgrammaticAddVizPayload {
  /** Flag to indicate programmatic execution. */
  runProgrammatically: true;
  /** The name for the new or existing style. */
  styleName: string;
  /** The full definition of the style. */
  styleDefinition: ISelAndStyle;
  /** Whether to overwrite an existing style with the same name. Defaults to false. */
  overwrite?: boolean;
}

/**
 * AddCustomStylePlugin allows users to define and add new custom molecular
 * visualization styles. These styles are based on selection criteria (like
 * residue name, chain ID) and a chosen representation (sphere, stick, etc.)
 * with a corresponding color scheme.
 */
@Options({
  components: {
    PluginComponent,
    ColorSchemeSelect,
    FormWrapper,
    FormElementDescription,
  },
})
export default class AddVizualizationPlugin extends PluginParentClass {
  menuPath = "View/Visualizations/New Visualization...";
  title = "New Visualization";
  pluginId = "addnewvisualization";
  intro = "Define a new visualization by specifying selection criteria, representation, and color.";
  tags = [Tag.Visualization, Tag.All];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [];
  currentSelectionRepType: Representation | null = null;
  currentRepresentationStyle: ISelAndStyle = {};

  // Residue name macro definitions (see VMD definitions for reference)
  private readonly residueMacros: Record<string, string[]> = {
    acidic: ['ASP', 'GLU'],
    aliphatic: ['ALA', 'GLY', 'ILE', 'LEU', 'VAL'],
    aromatic: ['HIS', 'PHE', 'TRP', 'TYR'],
    basic: ['ARG', 'HIS', 'LYS', 'HSP'],
    charged: ['ARG', 'HIS', 'LYS', 'HSP', 'ASP', 'GLU'], // basic + acidic
    hydrophobic: ['ALA', 'LEU', 'VAL', 'ILE', 'PRO', 'PHE', 'MET', 'TRP'],
    neutral: ['VAL', 'PHE', 'GLN', 'TYR', 'HIS', 'CYS', 'MET', 'TRP', 'ASX', 'GLX', 'PCA', 'HYP'],
    purine: ['ADE', 'A', 'GUA', 'G'],
    pyrimidine: ['CYT', 'C', 'THY', 'T', 'URA', 'U']
  };

  editMode = false;
  editingStyleName: string | null = null;
  // Store overwrite flag for programmatic runs temporarily
  private programmaticOverwrite = false;
  private programmaticMoleculeId: string | undefined = undefined;
  userArgDefaults: UserArg[] = [
    {
      id: "styleName",
      label: "Visualization name",
      val: "",
      placeHolder: "Blue Lysines...",
      description: "A unique name for this visualization.",
      validateFunc: (val: string) => val.trim().length > 0,
    } as IUserArgText,
    {
      id: "moleculeId",
      label: "Apply to molecule",
      type: UserArgType.Text,
      val: "",
      enabled: false, // This will hide it from the UI
      placeHolder: "(Optional) Molecule ID...",
      description:
        "Optional. Apply this visualization only to the molecule with this ID. Leave blank to apply to all molecules.",
    } as IUserArgText,
    {
      id: "selectionResidueNames",
      label: "Residue names",
      type: UserArgType.ListSelect,
      inputType: 'text',
      val: [],
      placeHolder: "LYS,ALA,TRP or acidic,basic (or leave empty for all)...",
      description: "Comma or space separated list of residue names (e.g. LYS ALA TRP) or macro keywords (acidic, basic, hydrophobic, etc.). 'Any' (empty list) to include all residues.",
      options: [
        // Will be populated dynamically with both macros and actual residues
      ] as IUserArgOption[],
    } as IUserArgListSelect,
    {
      id: "selectionResidueIds",
      label: "Residue numbers",
      type: UserArgType.ListSelect,
      inputType: 'number',
      val: [],
      placeHolder: "10-20,35,42 (or leave empty for all)...",
      description: "Comma or space separated list of residue numbers or ranges (e.g., 10-20 35 42). 'Any' (empty list) to include all residues.",
      options: [
        // Will be populated dynamically
      ] as IUserArgOption[],
    } as IUserArgListSelect,
    // {
    //   id: "selectionChainIds",
    //   label: "Chain IDs",
    //   type: UserArgType.ListSelect,
    //   inputType: 'text',
    //   val: [],
    //   placeHolder: "Any, or A,B...",
    //   description: "Comma or space separated list of chain identifiers. 'Any' (empty list) for no filter.",
    // } as IUserArgListSelect,
    // {
    //   id: "selectionAtomNames",
    //   label: "Atom names",
    //   type: UserArgType.ListSelect,
    //   inputType: 'text',
    //   val: [],
    //   placeHolder: "Any, or CA,N,O...",
    //   description: "Comma or space separated list of atom names (e.g., CA CB OXT). 'Any' (empty list) for no filter.",
    // } as IUserArgListSelect,
    // {
    //   id: "selectionElements",
    //   label: "Elements",
    //   type: UserArgType.ListSelect,
    //   inputType: 'text',
    //   val: [],
    //   placeHolder: "Any, or C,N,O...",
    //   description: "Comma or space separated list of element symbols (e.g., C Fe S). 'Any' (empty list) for no filter.",
    // } as IUserArgListSelect,
    {
      id: "representationType",
      label: "Representation",
      val: AtomsRepresentation.Sphere,
      type: UserArgType.Select,
      description: "Choose how the selected atoms will be displayed.",
      options: [
        { description: "Sphere", val: AtomsRepresentation.Sphere },
        { description: "Stick", val: AtomsRepresentation.Stick },
        { description: "Line", val: AtomsRepresentation.Line },
        { description: "Cartoon", val: BackBoneRepresentation.Cartoon },
        { description: "Surface", val: SurfaceRepresentation.Surface },
      ] as IUserArgOption[],
    } as IUserArgSelect,
  ];

  /**
   * Gets the text for the main action button, depending on whether the plugin
   * is in "add" or "edit" mode.
   *
   * @returns {string} The text for the action button.
   */
  get dynamicActionBtnTxt(): string {
    return this.editMode ? "Update Visualization" : "Add Visualization";
  }

  /**
   * Expands macro keywords into their corresponding residue names.
   *
   * @param {string[]} items The list of items that may contain macros.
   * @returns {string[]} The expanded list with macros replaced by their values.
   */
  private expandResidueNameMacros(items: string[]): string[] {
    const expandedSet = new Set<string>();

    for (const item of items) {
      const lowerItem = item.toLowerCase();
      if (this.residueMacros[lowerItem]) {
        // Add all residues from the macro
        this.residueMacros[lowerItem].forEach(residue => expandedSet.add(residue));
      } else {
        // Add the item as-is (convert to uppercase for consistency with residue names)
        expandedSet.add(item.toUpperCase());
      }
    }

    return Array.from(expandedSet).sort();
  }

  /**
   * Tree node type to pass to ColorSchemeSelect. Using 'Other' as a general
   * type for custom styles.
   *
   * @returns {TreeNodeType} The TreeNodeType.
   */
  get treeNodeTypeForColorSchemes(): TreeNodeType {
    return TreeNodeType.Other;
  }

  /**
   * Computed property to determine if the action button should be enabled.
   *
   * @returns {boolean} True if the button should be enabled, false otherwise.
   */
  get isActionBtnEnabled(): boolean {
    const styleNameUserArg = this.getUserArg("styleName");
    const styleName = typeof styleNameUserArg === 'string' ? styleNameUserArg : (styleNameUserArg as IUserArgText)?.val || ""; // Adjusted to safely access val
    return styleName.trim().length > 0 && this.currentSelectionRepType !== null;
  }

  /**
   * Called when a user argument changes. Updates the current representation
   * type and resets the color scheme.
   */
  onUserArgChange(): void {
    const repType = this.getUserArg("representationType") as Representation;
    if (this.currentSelectionRepType !== repType) {
      this.currentSelectionRepType = repType;
      // Reset the specific part of currentRepresentationStyle
      // This ensures ColorSchemeSelect gets a fresh object or {}
      this.currentRepresentationStyle = {};
    }
  }

  /**
   * Called when the ColorSchemeSelect component emits a change.
   */
  onColorSchemeChange(): void {
    // No changes made to this function
  }

  /**
   * Lifecycle hook, called before the popup opens. Initializes the current
   * representation type based on default user arguments and resets the current
   * representation style. If editing, pre-populates the form. If called with a
   * programmatic payload, sets up for no-UI execution.
   *
   * @param {AddVizPayload | ProgrammaticAddVizPayload} [payload] Optional
   *                                                              payload for UI
   *                                                              editing or
   *                                                              programmatic
   *                                                              run.
   * @returns {Promise<void | boolean>} A promise that resolves. Returns false
   *     if popup opening should be prevented (programmatic run).
   */
  async onBeforePopupOpen(payload?: AddVizPayload | ProgrammaticAddVizPayload): Promise<void | boolean> {
    this.noPopup = false; // Default to UI mode
    this.programmaticMoleculeId = undefined; // Reset at the start
    if (payload && (payload as ProgrammaticAddVizPayload).runProgrammatically) {
      const progPayload = payload as ProgrammaticAddVizPayload;
      this.setUserArg("styleName", progPayload.styleName);
      const { selection, ...representationAndColor } = progPayload.styleDefinition;
      this.programmaticMoleculeId = progPayload.styleDefinition.moleculeId;
      this.setUserArg("moleculeId", this.programmaticMoleculeId || "");
      if (selection) {
        this.setUserArg("selectionResidueNames", selection.resn || []);
        this.setUserArg("selectionResidueIds", selection.resi || []);
        // Note: Other selection criteria (chain, atom, elem) are not in
        // userArgDefaults by default. If they were, they'd be set here too.
      } else { // Ensure defaults are empty if no selection provided
        this.setUserArg("selectionResidueNames", []);
        this.setUserArg("selectionResidueIds", []);
      }

      const repTypes: Representation[] = [
        AtomsRepresentation.Sphere, AtomsRepresentation.Stick, AtomsRepresentation.Line,
        BackBoneRepresentation.Cartoon, SurfaceRepresentation.Surface
      ];
      let foundRepType: Representation | null = null;

      for (const rt of repTypes) {
        if (Object.prototype.hasOwnProperty.call(representationAndColor, rt)) {
          foundRepType = rt;
          break;
        }
      }

      if (foundRepType) {
        this.setUserArg("representationType", foundRepType);
        this.currentSelectionRepType = foundRepType;
        // Ensure currentRepresentationStyle has the correct structure for
        // ColorSchemeSelect or direct use
        this.currentRepresentationStyle = { [foundRepType]: (representationAndColor as any)[foundRepType] || {} };
      } else {
        messagesApi.popupError("Programmatic style definition is missing a valid representation (e.g., sphere, stick).");
        return false; // Prevent further processing
      }

      this.programmaticOverwrite = progPayload.overwrite ?? false;
      this.noPopup = true; // Signal to PluginParentClass to bypass UI and call onPopupDone
      // `onPopupDone` will be called by PluginParentClass due to `this.noPopup
      // = true` The state (userArgs, currentRepresentationStyle) is now set up
      // for onPopupDone.
      return; // Let PluginParentClass call openPopup, which then calls onPopupDone
    }

    // --- Existing UI-driven onBeforePopupOpen logic ---
    this.editMode = false;
    this.editingStyleName = null;
    this.title = "New Visualization"; // Default title for UI

    if (payload && (payload as AddVizPayload).styleNameToEdit) { // UI Edit mode
      const uiEditPayload = payload as AddVizPayload;
      this.editMode = true;
      this.editingStyleName = uiEditPayload.styleNameToEdit ?? null; // Ensure it's null if undefined
      this.title = "Edit Visualization";
      this.setUserArg("styleName", this.editingStyleName);

      // Cast assuming it will be string if editMode is true
      const styleToEdit = StyleManager.customSelsAndStyles[this.editingStyleName as string];
      if (styleToEdit) {
        this.programmaticMoleculeId = styleToEdit.moleculeId;
        this.setUserArg("moleculeId", styleToEdit.moleculeId || "");
        this.setUserArg("selectionResidueNames", styleToEdit.selection?.resn || []);
        this.setUserArg("selectionResidueIds", styleToEdit.selection?.resi || []);

        let repType: Representation | null = null;
        if (styleToEdit.sphere) repType = AtomsRepresentation.Sphere;
        else if (styleToEdit.stick) repType = AtomsRepresentation.Stick;
        else if (styleToEdit.line) repType = AtomsRepresentation.Line;
        else if (styleToEdit.cartoon) repType = BackBoneRepresentation.Cartoon;
        else if (styleToEdit.surface) repType = SurfaceRepresentation.Surface;

        if (repType) {
          this.setUserArg("representationType", repType);
          this.currentSelectionRepType = repType;
          this.currentRepresentationStyle = { [repType]: (styleToEdit as any)[repType] || {} };
        } else {
          // If no specific representation key is found, default to the one in
          // userArgs This handles cases where the style might be just a
          // selection with no explicit representation type like sphere/stick
          this.currentSelectionRepType = this.getUserArg("representationType") as Representation;
          // Reset style or try to infer if possible
          this.currentRepresentationStyle = {};
        }
      } else {
        this.editMode = false; // Revert to add mode if style not found
        this.editingStyleName = null;
        this.title = "New Visualization";
        messagesApi.popupError(`Style "${uiEditPayload.styleNameToEdit}" not found. Opening in 'New Visualization' mode.`);
        this.currentSelectionRepType = this.getUserArg("representationType") as Representation;
        this.currentRepresentationStyle = {};
      }
    } else { // UI Add mode
      this.setUserArg("moleculeId", "");
      this.currentSelectionRepType = this.getUserArg("representationType") as Representation;
      this.currentRepresentationStyle = {};
    }
    this.updateResidueOptions();
  }


  /**
   * Called when the plugin's main action is triggered. Parses user inputs,
   * constructs an ISelAndStyle object, and adds or updates it in the
   * StyleManager.
   *
   * @returns {Promise<void>} A promise that resolves when the operation is
   *  complete.
   */
  async onPopupDone(): Promise<void> {
    let styleName: string;
    let finalStyle: ISelAndStyle;
    let overwriteForStyleManagerCall: boolean;

    const formStyleNameVal = this.getUserArg("styleName");
    styleName = typeof formStyleNameVal === 'string' ? formStyleNameVal.trim() : "";


    if (!styleName) {
      if (!this.noPopup) {
        messagesApi.popupError("Visualization name cannot be empty.");
      }
      if (this.noPopup) this.noPopup = false; // Reset for next UI run
      return;
    }

    const selection: any = {};
    const resNamesArg = this.getUserArg("selectionResidueNames");
    if (Array.isArray(resNamesArg) && resNamesArg.length > 0) {
      selection.resn = this.expandResidueNameMacros(resNamesArg);
    }

    const resIdsArg = this.getUserArg("selectionResidueIds");
    if (Array.isArray(resIdsArg) && resIdsArg.length > 0) {
      selection.resi = resIdsArg;
    }

    // Note: chainIds, atomNames, elements are not in default userArgs, but if
    // they were, they would be processed here.

    finalStyle = { selection };
    const moleculeId = (this.getUserArg("moleculeId") as string)?.trim();
    if (moleculeId) {
      finalStyle.moleculeId = moleculeId;
    } else if (this.programmaticMoleculeId) {
      finalStyle.moleculeId = this.programmaticMoleculeId;
    }
    if (!this.currentSelectionRepType) {
      if (!this.noPopup) {
        messagesApi.popupError("A representation type must be selected.");
      }
      if (this.noPopup) this.noPopup = false; // Reset
      return;
    }

    // Safely access the color scheme, defaulting to an empty object if not set
    const colorSchemeObject = (this.currentRepresentationStyle as any)[this.currentSelectionRepType] || {};

    if (Object.keys(colorSchemeObject).length === 0 && !this.noPopup) { // Only show UI message if not programmatic
      messagesApi.popupMessage(
        "Info",
        `No specific color scheme was defined for ${this.currentSelectionRepType}. Default coloring will be applied by the viewer for this representation.`,
        PopupVariant.Info
      );
    }
    (finalStyle as any)[this.currentSelectionRepType] = colorSchemeObject;


    if (this.noPopup) { // Programmatic run path
      overwriteForStyleManagerCall = this.programmaticOverwrite;
    } else { // UI-driven path
      if (this.editMode && this.editingStyleName) {
        // UI Edit mode
        if (styleName !== this.editingStyleName && StyleManager.customSelsAndStyles[styleName]) {
          messagesApi.popupError(`A custom visualization with the name "${styleName}" already exists. Please choose a different name.`);
          return;
        }
        if (styleName !== this.editingStyleName) {
          StyleManager.deleteCustomStyle(this.editingStyleName);
          overwriteForStyleManagerCall = false; // Adding as new after delete
        } else {
          overwriteForStyleManagerCall = true; // Updating existing style with the same name
        }
      } else {
        // UI Add mode
        overwriteForStyleManagerCall = false; // For addCustomStyle, overwrite is false if it's a new style
      }
    }

    // Common logic for adding/updating the style
    const success = StyleManager.addCustomStyle(styleName, finalStyle, overwriteForStyleManagerCall);

    if (success && !this.noPopup) {
      const actionVerb = (this.editMode) || (overwriteForStyleManagerCall) ? 'updated' : 'added';
      // messagesApi.popupMessage("Success", `Visualization "${styleName}" ${actionVerb}.`, PopupVariant.Success);
      this.closePopup();
    }
    // StyleManager.addCustomStyle itself handles the "name collision and
    // overwrite=false" error message (if UI-driven).

    if (this.noPopup) { // Reset noPopup if it was set true for this programmatic run
      this.noPopup = false;
    }
    this.programmaticOverwrite = false; // Reset temporary prop
    this.programmaticMoleculeId = undefined;
  }

  /**
   * Required by PluginParentClass.
   *
   * @returns {Promise<void>} A promise that resolves immediately.
   */
  async runJobInBrowser(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Gets the test commands for the plugin.
   * 
   * @returns {Promise<ITest>} The selenium test commands.
   */
  async getTests(): Promise<ITest> {
    return FailingTest
    // {
    //   pluginOpen: new TestCmdList()
    //     .setUserArg("styleName", "TestCustomVisualization", this.pluginId)
    //     .setUserArg("representationType", AtomsRepresentation.Sphere, this.pluginId)
    //     .setUserArg("selectionResidueNames", "LYS", this.pluginId),
    //   // ColorSchemeSelect is tricky to test directly here without more interaction.
    //   // We'll assume its internal v-model works and the correct data is passed.
    //   // The main thing is to check if 'Add Style' can be clicked.
    //   closePlugin: new TestCmdList().click(`#modal-${this.pluginId} .action-btn`),
    //   afterPluginCloses: new TestCmdList().wait(1), // Wait for potential messages
    // };
  }

  /**
   * Watches for changes in the global molecules store and updates residue
   * options.
   */
  @Watch("$store.state.molecules", { deep: true })
  onMoleculesChanged() {
    this.updateResidueOptions();
  }

  /**
   * Updates the options for residue name and ID selection dropdowns based on
   * currently visible molecules.
   */
  private updateResidueOptions(): void {
    const { names, ids } = getUniqueResiduesFromVisibleMolecules();

    // Create macro options for the dropdown
    const macroOptions: IUserArgOption[] = Object.keys(this.residueMacros).map(macro => ({
      description: macro,  // `${macro} (${this.residueMacros[macro].join(', ')})`,
      val: macro
    }));

    // Create regular residue name options
    const nameOptions: IUserArgOption[] = names.map(name => ({ description: name, val: name }));

    // Create residue ID options
    const idOptions: IUserArgOption[] = ids.map(id => ({ description: String(id), val: id }));

    // Find the userArgs for residue names and IDs
    const selectionResidueNamesArg = this.userArgs.find(arg => arg.id === "selectionResidueNames") as IUserArgListSelect | undefined;
    const selectionResidueIdsArg = this.userArgs.find(arg => arg.id === "selectionResidueIds") as IUserArgListSelect | undefined;

    if (selectionResidueNamesArg) {
      // Combine macro options with regular residue names
      selectionResidueNamesArg.options = [...nameOptions, ...macroOptions];
    }
    if (selectionResidueIdsArg) {
      selectionResidueIdsArg.options = idOptions;
    }
  }
}
</script>

<style scoped lang="scss">
/* Add any specific styles for this plugin here */
</style>