<template>
  <PluginComponent v-model="open" :infoPayload="infoPayload" :actionBtnTxt="dynamicActionBtnTxt" @onPopupDone="onPopupDone"
    @onUserArgChanged="onUserArgChanged" :isActionBtnEnabled="isActionBtnEnabled"
    @onMolCountsChanged="onMolCountsChanged">
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

interface AddVizPayload {
  styleNameToEdit?: string;
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

  userArgDefaults: UserArg[] = [
    {
      id: "styleName",
      label: "Visualization name",
      val: "",
      placeHolder: "Blue Lysines...",
      description: "A unique name for this visualization.",
      validateFunc: (val: string) => val.trim().length > 0,
   readonly: false, // Default to not readonly
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
    // The v-model on ColorSchemeSelect should directly update
    // this.currentRepresentationStyle. We might need to force a re-evaluation
    // if Vue doesn't pick up deep changes within currentRepresentationStyle,
    // but usually v-model handles this.
    this.$forceUpdate(); // Force update if necessary
  }

  /**
   * Called when the plugin's main action is triggered. Parses user inputs,
   * constructs an ISelAndStyle object, and adds or updates it in the
   * StyleManager.
   *
   * @returns {Promise<void>} A promise that resolves when the operation is
   *     complete.
   */
  async onPopupDone(): Promise<void> {
    const formStyleName = (this.getUserArg("styleName") as string).trim();
    const nameToUse = this.editMode && this.editingStyleName ? this.editingStyleName : formStyleName;

    if (!nameToUse) {
      messagesApi.popupError("Visualization name cannot be empty.");
      return;
    }

    const selection: any = {};

    // Get and expand residue names (including macros)
    let resNames = this.getUserArg("selectionResidueNames") as string[];
    if (resNames.length > 0) {
      const expandedResNames = this.expandResidueNameMacros(resNames);
      selection.resn = expandedResNames;
    }

    let resIds = this.getUserArg("selectionResidueIds") as number[];
    if (resIds.length > 0) selection.resi = resIds;

    // const chainIds = this.getUserArg("selectionChainIds") as string[];
    // if (chainIds.length > 0) selection.chain = chainIds;

    // const atomNames = this.getUserArg("selectionAtomNames") as string[];
    // if (atomNames.length > 0) selection.atom = atomNames;

    // const elements = this.getUserArg("selectionElements") as string[];
    // if (elements.length > 0) selection.elem = elements;

    if (!this.currentSelectionRepType) {
      messagesApi.popupError("A representation type must be selected.");
      return;
    }

    const finalStyle: ISelAndStyle = { selection };
    const colorSchemeObject = (this.currentRepresentationStyle as any)[this.currentSelectionRepType];

    if (!colorSchemeObject || Object.keys(colorSchemeObject).length === 0) {
      messagesApi.popupMessage(
        "Info",
        `No specific color scheme was defined for ${this.currentSelectionRepType}. Default coloring will be applied by the viewer for this representation.`,
        PopupVariant.Info
      );
      // If no color scheme is explicitly set (e.g. user interaction didn't happen with ColorSchemeSelect)
      // we might imply that the representation itself is the primary style information,
      // and the viewer will use its default coloring for that representation.
      // So, we can proceed by setting an empty object for the representation's style,
      // or a default one if available.
      (finalStyle as any)[this.currentSelectionRepType] = {}; // Or a default if applicable
    } else {
    (finalStyle as any)[this.currentSelectionRepType] = colorSchemeObject;
    }


    const success = StyleManager.addCustomStyle(nameToUse, finalStyle, this.editMode); // Pass this.editMode as overwrite flag
    if (success) {
      messagesApi.popupMessage(
        "Success",
        `Visualization "${nameToUse}" ${this.editMode ? 'updated' : 'added'}.`,
        PopupVariant.Success
      );
      this.closePopup();
    }
  }

  /**
   * Lifecycle hook, called before the popup opens. Initializes the current
   * representation type based on default user arguments and resets the current
   * representation style. If editing, pre-populates the form.
   *
   * @param {AddVizPayload} [payload] Optional payload, e.g., for editing.
   * @returns {Promise<void>} A promise that resolves when pre-open operations
   *     are complete.
   */
  async onBeforePopupOpen(payload?: AddVizPayload) {
    // this.userArgs is already a fresh copy from userArgDefaults due to PluginParentClass.onPluginStart
    // which calls copyUserArgs(this.userArgDefaults).

    const styleNameArg = this.userArgs.find(arg => arg.id === 'styleName') as IUserArgText | undefined;

    if (payload && payload.styleNameToEdit) {
      this.editMode = true;
      this.editingStyleName = payload.styleNameToEdit;
      this.title = "Edit Visualization"; // This will be picked up by PluginComponent

      if (styleNameArg) {
        styleNameArg.val = this.editingStyleName;
        styleNameArg.readonly = true; // Make name field read-only
      }

      const styleToEdit = StyleManager.customSelsAndStyles[this.editingStyleName];
      if (styleToEdit) {
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
    this.currentSelectionRepType = this.getUserArg("representationType") as Representation;
          this.currentRepresentationStyle = {};
        }
      } else {
        // Style to edit not found, revert to add mode or show error
        this.editMode = false;
        this.editingStyleName = null;
        this.title = "New Visualization";
        if (styleNameArg) styleNameArg.readonly = false;
        messagesApi.popupError(`Style "${payload.styleNameToEdit}" not found. Opening in 'New Visualization' mode.`);
        // Ensure form is in a clean "add" state
        this.currentSelectionRepType = this.getUserArg("representationType") as Representation;
        this.currentRepresentationStyle = {};
      }
    } else {
      this.editMode = false;
      this.editingStyleName = null;
      this.title = "New Visualization";
      if (styleNameArg) {
        styleNameArg.readonly = false; // Ensure name field is editable for new styles
        // styleNameArg.val = ""; // Parent class resets this from userArgDefaults
      }
      // Initialize from defaults for add mode
      this.currentSelectionRepType = this.getUserArg("representationType") as Representation;
      this.currentRepresentationStyle = {};
    }
    this.updateResidueOptions(); // Ensure dropdown options are current
  }


  /**
   * Required by PluginParentClass. This plugin performs its action
   * synchronously within onPopupDone, so this method is a no-op.
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
 * Watches for changes in the global molecules store and updates residue options.
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