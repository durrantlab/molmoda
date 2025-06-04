<template>
    <PluginComponent
      v-model="open"
      :infoPayload="infoPayload"
      actionBtnTxt="Add Style"
      @onPopupDone="onPopupDone"
      @onUserArgChanged="onUserArgChanged"
      :isActionBtnEnabled="isActionBtnEnabled"
      @onMolCountsChanged="onMolCountsChanged"
    >
      <template #afterForm>
        <div v-if="currentSelectionRepType" class="mt-3">
          <ColorSchemeSelect
            :key="currentSelectionRepType"
            v-model="currentRepresentationStyle"
            :repName="currentSelectionRepType"
            :molType="treeNodeTypeForColorSchemes"
            @onChange="onColorSchemeChange"
          />
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
  import { IColorScheme } from "@/Core/Styling/Colors/ColorInterfaces";
  import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
  import { ITest } from "@/Testing/TestCmd";
  import { TestCmdList } from "@/Testing/TestCmdList";
  import { messagesApi } from "@/Api/Messages";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
  
  /**
   * Parses a comma-separated string of names into an array of uppercase
   * strings.
   *
   * @param {string} input The comma-separated string of names.
   * @returns {string[]} An array of parsed, trimmed, and uppercased names.
   */
  function parseNameListString(input: string): string[] {
    if (!input || !input.trim()) return [];
    return input
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);
  }
  
  /**
   * Parses a comma-separated string of numbers and numeric ranges (e.g.,
   * "1-5,7,10-12") into a sorted array of unique numbers.
   *
   * @param {string} input The string containing numbers and ranges.
   * @returns {number[]} A sorted array of unique numbers derived from the input
   *     string.
   */
  function parseNumericRangeString(input: string): number[] {
    if (!input.trim()) return [];
    const result: Set<number> = new Set();
    const parts = input.split(",");
    for (const part of parts) {
      const trimmedPart = part.trim();
      if (trimmedPart.includes("-")) {
        const [startStr, endStr] = trimmedPart.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            result.add(i);
          }
        } else {
          // console.warn(`Malformed range: ${trimmedPart}`);
        }
      } else {
        const num = parseInt(trimmedPart, 10);
        if (!isNaN(num)) {
          result.add(num);
        } else {
          // console.warn(`Malformed number: ${trimmedPart}`);
        }
      }
    }
    return Array.from(result).sort((a, b) => a - b);
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
    },
  })
  export default class AddCustomStylePlugin extends PluginParentClass {
    menuPath = "Style/Custom Styles/Add New Custom Style...";
    title = "Add New Custom Style";
    pluginId = "addcustomstyle";
    intro = "Define a new custom style by specifying selection criteria, representation, and color.";
    tags = [Tag.Visualization, Tag.All];
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
  
    currentSelectionRepType: Representation | null = null;
    currentRepresentationStyle: ISelAndStyle = {}; // Will hold e.g., { sphere: IColorScheme }
  
    userArgDefaults: UserArg[] = [
      {
        id: "styleName",
        label: "Style name",
        val: "",
        placeHolder: "Blue Lysines...",
        description: "A unique name for this custom style.",
        validateFunc: (val: string) => val.trim().length > 0,
      } as IUserArgText,
      {
        id: "representationType",
        label: "Representation",
        val: AtomsRepresentation.Sphere, // Default to sphere
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
      {
        id: "selectionResidueNames",
        label: "Residue names",
        val: "",
        placeHolder: "LYS,ALA,TRP...",
        description: "Comma-separated list of 3-letter residue names.",
      } as IUserArgText,
      {
        id: "selectionResidueIds",
        label: "Residue numbers",
        val: "",
        placeHolder: "10-20,35,42...",
        description: "Comma-separated list of residue numbers or ranges.",
      } as IUserArgText,
      {
        id: "selectionChainIds",
        label: "Chain IDs",
        val: "",
        placeHolder: "A,B...",
        description: "Comma-separated list of chain identifiers.",
      } as IUserArgText,
      {
        id: "selectionAtomNames",
        label: "Atom names",
        val: "",
        placeHolder: "CA,N,O...",
        description: "Comma-separated list of atom names (e.g., CA, CB, OXT).",
      } as IUserArgText,
      {
        id: "selectionElements",
        label: "Elements",
        val: "",
        placeHolder: "C,N,O...",
        description: "Comma-separated list of element symbols (e.g., C, Fe, S).",
      } as IUserArgText,
    ];
  
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
     * Called when a user argument changes.
     * Updates the current representation type and resets the color scheme.
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
     * Called when the plugin's main action ("Add Style") is triggered. Parses
     * user inputs, constructs an ISelAndStyle object, and adds it to the
     * StyleManager.
     *
     * @returns {Promise<void>} A promise that resolves when the operation is
     *     complete.
     */
    async onPopupDone(): Promise<void> {
      const styleName = (this.getUserArg("styleName") as string).trim();
      if (!styleName) {
        messagesApi.popupError("Style name cannot be empty.");
        return;
      }
  
      const selection: any = {};
      const resNames = parseNameListString(this.getUserArg("selectionResidueNames") as string);
      if (resNames.length > 0) selection.resn = resNames;
  
      const resIds = parseNumericRangeString(this.getUserArg("selectionResidueIds") as string);
      if (resIds.length > 0) selection.resi = resIds;
  
      const chainIds = parseNameListString(this.getUserArg("selectionChainIds") as string);
      if (chainIds.length > 0) selection.chain = chainIds; // 3Dmol handles array of chains
  
      const atomNames = parseNameListString(this.getUserArg("selectionAtomNames") as string);
      if (atomNames.length > 0) selection.atom = atomNames;
  
      const elements = parseNameListString(this.getUserArg("selectionElements") as string);
      if (elements.length > 0) selection.elem = elements;
  
      if (Object.keys(selection).length === 0) {
        messagesApi.popupError("At least one selection criterion must be specified.");
        return;
      }
      
      if (!this.currentSelectionRepType) {
        messagesApi.popupError("A representation type must be selected.");
        return;
      }
  
      const finalStyle: ISelAndStyle = { selection };
      // this.currentRepresentationStyle might be { sphere: {color: 'red'} }
      // we need to extract the value: {color: 'red'}
      const colorSchemeObject = (this.currentRepresentationStyle as any)[this.currentSelectionRepType];
  
      if (!colorSchemeObject || Object.keys(colorSchemeObject).length === 0) {
          messagesApi.popupError("Color scheme for the selected representation is not defined.");
          return;
      }
  
      (finalStyle as any)[this.currentSelectionRepType] = colorSchemeObject;
  
      const success = StyleManager.addCustomStyle(styleName, finalStyle);
      if (success) {
        messagesApi.popupMessage("Success", `Custom style "${styleName}" added.`, PopupVariant.Success);
        this.closePopup();
      }
      // If not successful, addCustomStyle would have shown an error.
    }
  
    /**
     * Lifecycle hook, called before the popup opens. Initializes the current
     * representation type based on default user arguments and resets the
     * current representation style.
     *
     * @returns {Promise<void>} A promise that resolves when pre-open operations
     *     are complete.
     */
    async onBeforePopupOpen() {
      // Initialize currentSelectionRepType from default userArgs
      this.currentSelectionRepType = this.getUserArg("representationType") as Representation;
      this.currentRepresentationStyle = {}; // Reset
    }
  
    /**
     * Required by PluginParentClass. This plugin performs its action synchronously
     * within onPopupDone, so this method is a no-op.
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
      return {
        pluginOpen: new TestCmdList()
          .setUserArg("styleName", "TestCustomSphere", this.pluginId)
          .setUserArg("representationType", AtomsRepresentation.Sphere, this.pluginId)
          .setUserArg("selectionResidueNames", "LYS", this.pluginId),
        // ColorSchemeSelect is tricky to test directly here without more interaction.
        // We'll assume its internal v-model works and the correct data is passed.
        // The main thing is to check if 'Add Style' can be clicked.
        closePlugin: new TestCmdList().click(`#modal-${this.pluginId} .action-btn`),
        afterPluginCloses: new TestCmdList().wait(1), // Wait for potential messages
      };
    }
  }
  </script>
  
  <style scoped lang="scss">
  /* Add any specific styles for this plugin here */
  </style>