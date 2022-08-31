<template>
  <span v-if="visibleProteinChains.length > 1">
    {{visibleProteinElements}}
    <FormSelect v-model="val" :options="options"></FormSelect>
    <!-- <input
      ref="inputElem"
      :type="type"
      :class="
        'form-control form-control-sm' +
        (type === 'color' ? ' form-control-color' : '') +
        (type === 'range' ? ' form-range border-0 shadow-none' : '')
      "
      :id="id"
      :placeholder="placeHolder"
      :disabled="disabled"
      @input="handleInput"
      @keydown="onKeyDown"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
    />
    <FormElementDescription
      v-if="description !== undefined"
      :htmlDescription="description"
    ></FormElementDescription> -->
  </span>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options, Vue } from "vue-class-component";
import FormElementDescription from "@/UI/Forms/FormElementDescription.vue";
import { IMolContainer, MolType } from "../Navigation/TreeView/TreeInterfaces";
import { getRootNodesOfType, getTerminalNodes } from "../Navigation/TreeView/TreeUtils";
import FormSelect, { IFromOption } from "./FormSelect.vue";

@Options({
  components: {
    FormElementDescription,
    FormSelect
  },
})
export default class CombineProteins extends Vue {
  // @Prop({ required: true }) modelValue!: any;
  // @Prop({ default: randomID() }) id!: string;
  // @Prop({ default: "text" }) type!: string;
  // @Prop({ default: "placeholder" }) placeHolder!: string;
  // @Prop({ default: false }) disabled!: boolean;
  // // @Prop({ required: false }) filterFunc!: Function;
  // @Prop({}) description!: string;
  // @Prop({default: 500}) delayBetweenChangesDetected!: number;

  options: IFromOption[] = [
    {
      "description": "BETTER NAMES HERE! Merge All Chains into One",
      "val": "merge_all"
    },
    {
      "description": "Merge Chains of the Same Protein",
      "val": "per_protein"
    },
    {
      "description": "Consider Each Chain Separately",
      "val": "per_chain"
    }
  ]
  val = "merge_all"

  get molecules(): IMolContainer[] {
    return this.$store.state.molecules;
  }

  get visibleProteinElements(): string {
    const protTxt = this.visibleProteins.length > 1 ? "proteins" : "protein";
    const chainTxt = this.visibleProteinChains.length > 1 ? "chains" : "chain";

    return `Detected ${this.visibleProteinChains.length} visible protein ${chainTxt} present in ${this.visibleProteins.length} ${protTxt}.`;
  }

  get visibleProteins(): IMolContainer[] {
    // Get number of visible proteins (top-level menu items).
    let proteins = getRootNodesOfType(this.molecules, MolType.PROTEIN);
    proteins = proteins.filter(p => p.visible);
    return proteins;
  }

  get visibleProteinChains(): IMolContainer[] {
    // Get the number of chains (terminal nodes).
    let terminalNodes = getTerminalNodes(this.molecules);
    let proteinChains: IMolContainer[] = terminalNodes.filter(m => m.type === MolType.PROTEIN && m.visible);

    return proteinChains;
  }

  // lastHandleInputTimeStamp = 0;
  // timeOutLastHandleInput: any = null;

  // onKeyDown(e: KeyboardEvent) {
  //   this.$emit("onKeyDown");
  // }

  // handleInput(e: any): void {
  //   if (this.filterFunc) {
  //     // If there's a filter funciton, update everything.

  //     // Get carot location
  //     let carot = e.target.selectionStart;

  //     // Apply filter
  //     e.target.value = this.filterFunc(e.target.value);

  //     // Set carot location after vue nexttick
  //     this.$nextTick(() => {
  //       e.target.setSelectionRange(carot, carot);
  //     });
  //   }

  //   // No filter funciton. Note that it's delayed to prevent rapid reactivity.
  //   // Good for color selector.

  //   // If less 0.5 seconds haven't passed yet, don't try again.
  //   if (Date.now() - this.lastHandleInputTimeStamp < this.delayBetweenChangesDetected) {
  //     return;
  //   }

  //   this.lastHandleInputTimeStamp = Date.now();
  //   this.timeOutLastHandleInput = setTimeout(() => {
  //     let val = e.target.value;
  //     if (this.type === "number") {
  //       val = parseFloat(val);
  //       if (val === null) {
  //         val = 0;
  //       }
  //     }

  //     this.$emit("update:modelValue", val);

  //     // In some circumstances (e.g., changing values in an object), not reactive.
  //     // So emit also "onChange" to signal the value has changed.
  //     this.$emit("onChange");
  //   }, this.delayBetweenChangesDetected);
  // }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
// Input of type color
.form-control-color {
  width: 100%;
}
</style>
