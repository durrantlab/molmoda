<template>
  <span>
    <!-- <WhichMols
      v-if="isSelectWhichMolToConsidervisible"
      v-model="val.molsToUse"
    ></WhichMols> -->
    <FormWrapper label="Which project molecules to consider?" cls="border-0">
      <FormSelect
        v-model="molsToConsiderAsStr"
        :options="molsToConsiderOpts"
      ></FormSelect>
    </FormWrapper>

    <FormWrapper
      v-if="isSelectWhichMolToConsidervisible && val.considerProteins"
      label="What is a distinct protein?"
      cls="border-0"
    >
      <FormSelect
        v-model="val.molMergeStrategy"
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
import {
  getCompoundsToUse,
  getMolDescription,
  getProteinChainsToUse,
  getProteinsToUse,
} from "@/UI/Navigation/TreeView/TreeUtils";
import Alert from "@/UI/Layout/Alert.vue";
import FormSelect from "../FormSelect.vue";
import { IFormOption } from "../FormFull/FormFullInterfaces";
import {
  defaultMoleculeInputParams,
  IMoleculeInputParams,
  molsToConsiderOptions,
  molsToConsiderStrToObj,
  molsToConsiderToStr,
} from "./Types";
import {
  compileMolModels,
  IMolsToConsider,
  MolMergeStrategy,
} from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
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

  // Shadows modelValue
  val: IMoleculeInputParams = { ...defaultMoleculeInputParams() };

  molsToConsiderOpts = molsToConsiderOptions;

  mergeProtein: IFormOption[] = [
    {
      description: "Each Protein (Group Associated Chains)",
      val: MolMergeStrategy.ByMolecule,
    },
    {
      description: "All Proteins Together (Group All Proteins into One)",
      val: MolMergeStrategy.OneMol,
    },
    {
      description: "Each Protein Chain Separately (Group Nothing)",
      val: MolMergeStrategy.ByChain,
    },
  ];

  // IMolsToConsider is object, but select uses string. So watch this string
  // enum and update accordingly.
  molsToConsiderAsStr = molsToConsiderToStr(
    defaultMoleculeInputParams().molsToConsider
  );

  @Watch("molsToConsiderAsStr")
  onMolsToConsiderAsStrChange() {
    this.val.molsToConsider = molsToConsiderStrToObj[this.molsToConsiderAsStr];
  }

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

    const molsToConsid = this.val.molsToConsider;
    if (molsToConsid.all === true) {
      txt += "Among all molecules, I found ";
    } else if (
      molsToConsid.visible === true &&
      molsToConsid.selected === true
    ) {
      txt += "Among the visible and/or selected molecules, I found ";
    } else if (molsToConsid.visible === true) {
      txt += "Among the visible molecules, I found ";
    } else if (molsToConsid.selected === true) {
      txt += "Among the selected molecules, I found ";
    }

    let prts: string[] = [];

    const compiledMols = compileMolModels(
      this.val.molMergeStrategy,
      molsToConsid,
      true // Keep compounds separate.
    );

    const nodeGroups = compiledMols.nodeGroups ?? [];
    const compoundsNodes = compiledMols.compoundsNodes ?? [];
    const nodeGroupsCount = nodeGroups.length;
    const compoundsNodesCount = compoundsNodes.length;

    if (this.val.considerProteins) {
      switch (this.val.molMergeStrategy) {
        case MolMergeStrategy.ByMolecule:
          // protPrtsCount = (compiledMols.nonCompoundNodes as any).length; //  this.proteinsToUse.length;
          prts.push(
            (nodeGroupsCount !== 1
              ? `${nodeGroupsCount} proteins`
              : "1 protein") + ` (${this.listMols(nodeGroups[0])})` // TODO: First mol for now. Need to think about this. Parent?
          );
          break;
        case MolMergeStrategy.OneMol:
          if (nodeGroupsCount === 0) {
            // if ((compiledMols.allNodes as any) === 0) {
            prts.push("0 (merged) proteins");
          } else {
            prts.push("1 (merged) protein");
          }
          break;
        case MolMergeStrategy.ByChain:
          // protPrtsCount = (compiledMols.nonCompoundNodes as any).length; // this.proteinChainsToUse.length;
          prts.push(
            (nodeGroupsCount !== 1
              ? `${nodeGroupsCount} protein chains`
              : "1 protein chain") + ` (${this.listMols(nodeGroups[0])})` // First one. Think about this.
          );
          break;
      }
    }

    // let cmpPrtsCount = -1;
    if (this.val.considerCompounds) {
      // cmpPrtsCount = (compiledMols.compoundNodes as any).length; // this.compoundsToUse.length;
      prts.push(
        (compoundsNodesCount !== 1
          ? `${compoundsNodesCount} compounds`
          : "1 compound") + ` (${this.listMols(compoundsNodes)})`
      );
    }

    txt += prts.join(" and ");
    txt += ", so this calculation will run ";
    if (nodeGroupsCount !== -1 && compoundsNodesCount !== -1) {
      const total = nodeGroupsCount * compoundsNodesCount;
      txt += `${total} ($nodeGroupsCount} x ${compoundsNodesCount}) times.`;
    } else if (nodeGroupsCount !== -1) {
      txt += `$nodeGroupsCount} times (once for each protein).`;
    } else if (compoundsNodesCount !== -1) {
      txt += `${compoundsNodesCount} times (once for each compound).`;
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
  // get proteinsToUse(): IMolContainer[] {
  //   // Get number of visible proteins (top-level menu items).
  //   return getProteinsToUse(this.val.molsToConsider, this.molecules);
  // }

  /**
   * Gets the visible protein chains.
   *
   * @returns {IMolContainer[]}  The visible protein chains.
   */
  // get proteinChainsToUse(): IMolContainer[] {
  //   return getProteinChainsToUse(this.val.molsToConsider, this.molecules);
  // }

  /**
   * Determines whether user should be able to select which protein to consider.
   * If there is only one protein, no need to allow the user to select. TODO:
   * This doesn't account for ligands!
   *
   * @returns {boolean}  true if should be visible, false if not.
   */
  get isSelectWhichMolToConsidervisible(): boolean {
    return (
      getProteinChainsToUse({ all: true } as IMolsToConsider, this.molecules)
        .length > 1
    );
  }

  /**
   * Gets the visible compounds.
   *
   * @returns {IMolContainer[]}  The visible compounds.
   */
  // get compoundsToUse(): IMolContainer[] {
  //   return getCompoundsToUse(this.val.molsToConsider, this.molecules);
  // }

  /**
   * Watches val and emits the modelValue.
   *
   * @param {IMoleculeInputParams} newVal  The new value.
   */
  @Watch("val", { deep: true })
  onValChanged(newVal: IMoleculeInputParams) {
    // newVal.molsToUse = parseInt(newVal.molsToUse as any);
    this.molsToConsiderAsStr = molsToConsiderToStr(newVal.molsToConsider);
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
   * The mounted function, to set the initial val from modelValue.
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
