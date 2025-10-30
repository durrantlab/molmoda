<template>
  <span>
    <FormWrapper cls="border-0" :label="textToUse">
      <FormSelect
        v-model="selectionMode"
        :options="selectionOptions"
        :id="tag + '-molecule-selection'"
      />
      <!-- :description="`Choose which ${molNameToUse} to consider`" -->
      <FormCheckBox
        v-if="
          val.considerProteins &&
          val.allowUserToToggleIncludeMetalsAsProtein
        "
        v-model="val.includeMetalsAsProtein"
        text="Count metals/ions as part of the protein"
        :id="tag + '-include-metals'"
      />
      <FormCheckBox
        v-if="
          val.considerProteins &&
          val.allowUserToToggleIncludeSolventAsProtein
        "
        v-model="val.includeSolventAsProtein"
        text="Count solvent as part of the protein"
        :id="tag + '-include-solvent'"
      />
    </FormWrapper>
    <FormElementDescription :description="summary"></FormElementDescription>
  </span>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import FormElementDescription from "@/UI/Forms/FormElementDescription.vue";
import FormWrapper from "../FormWrapper.vue";
import Alert from "@/UI/Layout/Alert.vue";
import FormSelect from "../FormSelect.vue";
import { compileMolModels } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
import FormCheckBox from "../FormCheckBox.vue";
import { IProtCmpdCounts, MoleculeInput } from "./MoleculeInput";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

/**
 * Returns a string with the number and noun, pluralizing the noun if necessary.
 *
 * @param {number} num   The number to use
 * @param {string} noun  The noun to use
 * @returns {string} The formatted string
 */
function numAndNoun(num: number, noun: string): string {
  return num === 1 ? `1 ${noun}` : `${num} ${noun}s`;
}

/**
 * MoleculeInputParams component provides a user interface for selecting which
 * molecules to consider in calculations. It allows users to choose between
 * visible, selected, or all molecules, and provides feedback about how many
 * molecules will be processed.
 */
@Options({
  components: {
    FormElementDescription,
    FormSelect,
    FormWrapper,
    Alert,
    FormCheckBox,
  },
})
export default class MoleculeInputParams extends Vue {
  @Prop({ default: new MoleculeInput() }) modelValue!: MoleculeInput;
  @Prop({ required: true }) tag!: string;
  @Prop({ default: "" }) text!: string;

  val: MoleculeInput = new MoleculeInput();
  selectionMode = "visible";

  /**
   * Gets the text to use in the UI. If the text prop is empty, uses a default
   * message based on the molecule name.
   *
   * @returns {string} The text to use
   */
  get textToUse(): string {
    return this.text !== "" || this.text === undefined
      ? this.text
      : `${this.molNameToUse
          .slice(0, 1)
          .toUpperCase()}${this.molNameToUse.slice(1)} to consider`;
  }

  /**
   * Provides the options for the molecule selection dropdown.
   * Options change dynamically based on whether we're dealing with compounds or all molecules.
   *
   * @returns {Array<{description: string, val: string}>} Array of selection options
   */
  get selectionOptions() {
    return [
      { description: `Consider visible ${this.molNameToUse}`, val: "visible" },
      {
        description: `Consider selected ${this.molNameToUse}`,
        val: "selected",
      },
      { description: `Consider all ${this.molNameToUse}`, val: "all" },
    ];
  }

  /**
   * Gets the molecules from the Vuex store.
   *
   * @returns {TreeNodeList} The list of all molecules in the store
   */
  get molecules(): TreeNodeList {
    return this.$store.state.molecules;
  }

  /**
   * Determines whether to use "compounds" or "molecules" in the UI text.
   * Uses "compounds" if only compounds are being considered, "molecules" otherwise.
   *
   * @returns {string} Either "compounds" or "molecules"
   */
  get molNameToUse(): string {
    if (this.val.considerCompounds && !this.val.considerProteins) {
      return "compounds";
    }
    if (!this.val.considerCompounds && this.val.considerProteins) {
      return "proteins";
    }
    return "protein/compound pairs";
  }

  /**
   * Updates the molsToConsider configuration based on the selection mode.
   *
   * @param {string} newMode The new selection mode
   */
  @Watch("selectionMode")
  onSelectionModeChange(newMode: string) {
    // Update the molsToConsider based on selection mode
    this.val.molsToConsider = {
      visible: newMode === "visible" || newMode === "all",
      selected: newMode === "selected" || newMode === "all",
      hiddenAndUnselected: newMode === "all",
    };
  }

  /**
   * Generates a detailed summary of what molecules will be processed.
   * Includes counts of proteins and compounds, total number of calculations that will run,
   * and warnings about previously processed molecules.
   *
   * @returns {string} HTML-formatted summary string
   */
  get summary(): string {
    let actsOn = "";
    if (this.val.considerCompounds && this.val.considerProteins) {
      actsOn = "protein/compound pairs";
    } else if (this.val.considerCompounds) {
      actsOn = "compounds";
    } else if (this.val.considerProteins) {
      actsOn = "proteins";
    }

    let whichMols = "";
    if (this.selectionMode === "all") {
      whichMols = "all";
    } else if (this.selectionMode === "visible") {
      whichMols = "the visible";
    } else if (this.selectionMode === "selected") {
      whichMols = "the selected";
    }

    const mergedByMols = compileMolModels(this.val.molsToConsider, true);
    const nodeGroups = mergedByMols.nodeGroups ?? [];
    const nodeGroupsCount = nodeGroups.length;
    const compoundsNodes = mergedByMols.compoundsNodes ?? [];
    const compoundsNodesCount = compoundsNodes.length;

    this.$emit("onMolCountsChanged", {
      compounds: compoundsNodesCount,
      proteins: nodeGroupsCount,
    } as IProtCmpdCounts);

    let prts: string[] = [];
    if (this.val.considerProteins) {
      prts.push(numAndNoun(nodeGroupsCount, "protein"));
    }
    if (this.val.considerCompounds) {
      prts.push(numAndNoun(compoundsNodesCount, "compound"));
    }

    let components = prts.join(" and ");
    let numRuns = "";
    let warningClass = "";
    if (this.val.considerCompounds && this.val.considerProteins) {
      const total = nodeGroupsCount * compoundsNodesCount;
      numRuns = `${total} (${nodeGroupsCount} x ${compoundsNodesCount}) times`;
      if (total === 0) warningClass = "text-danger fw-bold";
    } else if (this.val.considerProteins) {
      numRuns = `${nodeGroupsCount} times (once for each protein)`;
      if (nodeGroupsCount === 0) warningClass = "text-danger fw-bold";
    } else if (this.val.considerCompounds) {
      numRuns = `${compoundsNodesCount} times (once for each compound)`;
      if (compoundsNodesCount === 0) warningClass = "text-danger fw-bold";
    } else {
      numRuns = "0 times";
      warningClass = "text-danger fw-bold";
    }

    let msg = `This calculation acts on ${actsOn}. Among ${whichMols} molecules, I found <b>${components}</b>, <span class="${warningClass}">so this calculation will run <b>${numRuns}</b>.</span>`;

    // Check for existing tags
    let numProtsAlreadyWithTag = 0;
    for (const nodeGroup of nodeGroups) {
      for (const nd of nodeGroup.terminals.nodes) {
        if (nd.tags?.includes(this.tag)) {
          numProtsAlreadyWithTag++;
        }
      }
    }

    let numCompsAlreadyWithTag = 0;
    for (const nd of (compoundsNodes as TreeNodeList).nodes) {
      if (nd.tags?.includes(this.tag)) {
        numCompsAlreadyWithTag++;
      }
    }

    if (numProtsAlreadyWithTag > 0 || numCompsAlreadyWithTag > 0) {
      const compsAlreadyWithTag = [];
      if (numProtsAlreadyWithTag > 0) {
        compsAlreadyWithTag.push(numAndNoun(numProtsAlreadyWithTag, "protein"));
      }
      if (numCompsAlreadyWithTag > 0) {
        compsAlreadyWithTag.push(
          numAndNoun(numCompsAlreadyWithTag, "compound")
        );
      }
      const compsAlreadyWithTagStr = compsAlreadyWithTag.join(" and ");
      const pronoun =
        numProtsAlreadyWithTag + numCompsAlreadyWithTag > 1 ? "them" : "it";
      const were =
        numProtsAlreadyWithTag + numCompsAlreadyWithTag > 1 ? "were" : "was";
      msg += ` <span class="text-danger fw-bold">Warning: Of these molecules, ${compsAlreadyWithTagStr} ${were} created with this same plugin. Are you sure you want to include ${pronoun} again?</span>`;
    }

    return msg;
  }

  /**
   * Updates the component when the val prop changes. Emits the
   * update:modelValue event and the onChange event.
   *
   * @param {MoleculeInput} newVal The new val prop
   */
  @Watch("val", { deep: true })
  onValChanged(newVal: MoleculeInput) {
    this.$emit("update:modelValue", newVal);
    this.$emit("onChange");
  }

  /**
   * Updates the component when the model value changes.
   *
   * @param {MoleculeInput} newVal The new model value
   */
  @Watch("modelValue", { deep: true })
  onModelValueChanged(newVal: MoleculeInput) {
    this.val = newVal;
  }

  /**
   * Initializes the component when mounted.
   * Sets the initial molecule selection mode based on the existing molsToConsider configuration.
   */
  mounted() {
    this.val = this.modelValue;
    // Set initial selection mode based on molsToConsider
    if (this.val.molsToConsider.hiddenAndUnselected) {
      this.selectionMode = "all";
    } else if (this.val.molsToConsider.selected) {
      this.selectionMode = "selected";
    } else {
      this.selectionMode = "visible";
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
// Input of type color
.form-control-color {
  width: 100%;
}

.fw-bold {
  font-weight: bold;
}
</style>
