<template>
  <span>
    <!-- <WhichMols
      v-if="isSelectWhichMolToConsidervisible"
      v-model="val.molsToUse"
    ></WhichMols> -->
    <FormWrapper label="Which project molecules to consider?" cls="border-0">
      <FormSelect v-model="val.molsToUse" :options="molsToUseOpts"></FormSelect>
    </FormWrapper>

    <FormWrapper
      v-if="isSelectWhichMolToConsidervisible && val.considerProteins"
      label="What is a distinct protein?"
      cls="border-0"
    >
      <FormSelect
        v-model="val.combineProteinType"
        :options="mergeProtein"
      ></FormSelect>
    </FormWrapper>
    <FormWrapper cls="mt-3">
      <Alert type="info">{{ summary }}</Alert>
    </FormWrapper>
  </span>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import FormElementDescription from "@/UI/Forms/FormElementDescription.vue";
import { IMolContainer } from "../../Navigation/TreeView/TreeInterfaces";
import FormWrapper from "../FormWrapper.vue";
import * as api from "@/Api";
import { getMolDescription } from "@/UI/Navigation/TreeView/TreeUtils";
import Alert from "@/UI/Layout/Alert.vue";
import FormSelect from "../FormSelect.vue";
import { IFormOption } from "../FormFull/FormFullInterfaces";
import { CombineProteinType, defaultMoleculeInputParams, IMoleculeInputParams, MolsToUse, molsToUseOptions } from "./Definitions";
// import WhichMols from "../WhichMols/WhichMols.vue";

/**
 * CombineProteins component
 */
@Options({
  components: {
    FormElementDescription,
    FormSelect,
    FormWrapper,
    Alert,
    // WhichMols,
  },
})
export default class MoleculeInputParams extends Vue {
  @Prop({ default: { ...defaultMoleculeInputParams() } })
  modelValue!: IMoleculeInputParams;

  molsToUseOpts = molsToUseOptions;

  val: IMoleculeInputParams = { ...defaultMoleculeInputParams() };

  mergeProtein: IFormOption[] = [
    {
      description: "Each Protein (Group Associated Chains)",
      val: CombineProteinType.PerProtein,
    },
    {
      description: "All Proteins Together (Group All Proteins into One)",
      val: CombineProteinType.MergeAll,
    },
    {
      description: "Each Protein Chain Separately (Group Nothing)",
      val: CombineProteinType.PerChain,
    },
  ];

  /**
   * Gets the molecules from the store.
   *
   * @returns {IMolContainer[]}  The molecules from the store.
   */
  get molecules(): IMolContainer[] {
    return this.$store.state.molecules;
  }

  /**
   * Gets the summary of the current protein/compounds that will be used.
   *
   * @returns {string}  The summary of the current protein/compounds that will
   *     be used.
   */
  get summary(): string {
    let txt = "";

    if (this.val.considerCompounds && this.val.considerProteins) {
      txt += "This calculation acts on protein/compound pairs. ";
    } else if (this.val.considerCompounds) {
      txt += "This calculation acts on compounds. ";
    } else if (this.val.considerProteins) {
      txt += "This calculation acts on proteins. ";
    }

    switch (this.val.molsToUse) {
      case MolsToUse.All:
        txt += "Among all molecules, I found ";
        break;
      case MolsToUse.Visible:
        txt += "Among the visible molecules, I found ";
        break;
      case MolsToUse.Selected:
        txt += "Among the selected molecules, I found ";
        break;
      case MolsToUse.VisibleOrSelected:
        txt += "Among the visible and/or selected molecules, I found ";
        break;
    }

    let prts: string[] = [];

    let protPrtsCount = -1;
    if (this.val.considerProteins) {
      switch (this.val.combineProteinType) {
        case CombineProteinType.PerProtein:
          protPrtsCount = this.proteinsToUse.length;
          prts.push(
            (protPrtsCount !== 1 ? `${protPrtsCount} proteins` : "1 protein") +
              ` (${this.listMols(this.proteinsToUse)})`
          );
          break;
        case CombineProteinType.MergeAll:
          if (this.proteinChainsToUse.length === 0) {
            prts.push("0 (merged) proteins");
          } else {
            prts.push("1 (merged) protein");
          }
          break;
        case CombineProteinType.PerChain:
          protPrtsCount = this.proteinChainsToUse.length;
          prts.push(
            (protPrtsCount !== 1
              ? `${protPrtsCount} protein chains`
              : "1 protein chain") +
              ` (${this.listMols(this.proteinChainsToUse)})`
          );
          break;
      }
    }

    let cmpPrtsCount = -1;
    if (this.val.considerCompounds) {
      cmpPrtsCount = this.compoundsToUse.length;
      prts.push(
        (cmpPrtsCount !== 1 ? `${cmpPrtsCount} compounds` : "1 compound") +
          ` (${this.listMols(this.compoundsToUse)})`
      );
    }

    txt += prts.join(" and ");
    txt += ", so this calculation will run ";
    if (protPrtsCount !== -1 && cmpPrtsCount !== -1) {
      txt += `${
        protPrtsCount * cmpPrtsCount
      } (${protPrtsCount} x ${cmpPrtsCount}) times.`;
    } else if (protPrtsCount !== -1) {
      txt += `${protPrtsCount} times (once for each protein).`;
    } else if (cmpPrtsCount !== -1) {
      txt += `${cmpPrtsCount} times (once for each compound).`;
    }

    // const protTxt = this.visibleProteins.length !== 1 ? "proteins" : "protein";
    // const chainTxt = this.visibleProteinChains.length !== 1 ? "chains" : "chain";
    // txt += `but there are ${this.visibleProteinChains.length} visible protein ${chainTxt} grouped into ${this.visibleProteins.length} ${protTxt}. `;
    // txt += "What should be considered a distinct protein?";

    return txt;
  }

  /**
   * Lists the molecules in string format, at most two.
   *
   * @param {IMolContainer[]} mols  The molecules to list.
   * @returns {string}  The molecules in string format, at most two.
   */
  listMols(mols: IMolContainer[]): string {
    let descriptions = mols.map((m) =>
      getMolDescription(m, this.molecules, true)
    );
    if (descriptions.length > 2) {
      descriptions = descriptions.slice(0, 2);
      descriptions.push("...");
    }
    return descriptions.join(", ");
  }

  /**
   * Gets the visible proteins.
   *
   * @returns {IMolContainer[]}  The visible proteins.
   */
  get proteinsToUse(): IMolContainer[] {
    // Get number of visible proteins (top-level menu items).
    return api.visualization.getProteinsToUse(
      this.val.molsToUse,
      this.molecules
    );
  }

  /**
   * Gets the visible protein chains.
   *
   * @returns {IMolContainer[]}  The visible protein chains.
   */
  get proteinChainsToUse(): IMolContainer[] {
    return api.visualization.getProteinChainsToUse(
      this.val.molsToUse,
      this.molecules
    );
  }

  /**
   * Determines whether user should be able to select which protein to consider.
   * If there is only one protein, no need to allow the user to select. TODO:
   * This doesn't account for ligands!
   *
   * @returns {boolean}  true if should be visible, false if not.
   */
  get isSelectWhichMolToConsidervisible(): boolean {
    return (
      api.visualization.getProteinChainsToUse(MolsToUse.All, this.molecules)
        .length > 1
    );
  }

  /**
   * Gets the visible compounds.
   *
   * @returns {IMolContainer[]}  The visible compounds.
   */
  get compoundsToUse(): IMolContainer[] {
    return api.visualization.getCompoundsToUse(
      this.val.molsToUse,
      this.molecules
    );
  }

  /**
   * Watches val and emits the modelValue.
   *
   * @param {IMoleculeInputParams} newVal  The new value.
   */
  @Watch("val", { deep: true })
  onValChanged(newVal: IMoleculeInputParams) {
    newVal.molsToUse = parseInt(newVal.molsToUse as any);
    this.$emit("update:modelValue", newVal);
    this.$emit("onChange");
  }

  /**
   * Watches modelValue and sets val accordingly.
   *
   * @param {IMoleculeInputParams} newVal  The new value.
   */
  @Watch("modelValue", { deep: true })
  onModelValueChanged(newVal: IMoleculeInputParams) {
    this.val = newVal;
  }

  /**
   * The mounted function, to set the initial vla from modelValue.
   */
  mounted() {
    this.val = this.modelValue;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
// Input of type color
.form-control-color {
  width: 100%;
}
</style>
