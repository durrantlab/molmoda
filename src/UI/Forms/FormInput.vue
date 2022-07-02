<template>
  <input
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
    :value="modelValue"

    :min="min"
    :max="max"
    :step="step"
  />
</template>

<script lang="ts">
/* eslint-disable */

import { randomID } from "@/Core/Utils";
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

@Options({
  components: {},
})
export default class FormInput extends Vue {
  @Prop({ required: true }) modelValue!: any;
  @Prop({ default: randomID() }) id!: string;
  @Prop({ default: "text" }) type!: string;
  @Prop({ default: "placeholder" }) placeHolder!: string;
  @Prop({ default: false }) disabled!: boolean;

  // Below used for range.
  @Prop({ default: undefined}) min!: number;
  @Prop({ default: undefined}) max!: number;
  @Prop({ default: undefined}) step!: number;

  handleInput(e: any) {
    let val = e.target.value;
    if (this.type === "number") {
      // TODO: Need some sort of validation here. When can't be parsed, returns
      // null.
      val = parseFloat(val);
    }
    this.$emit("update:modelValue", val);

    // In some circumstances (e.g., changing values in an object), not reactive.
    // So emit also "changed" to indicate the value has changed.
    this.$emit("changed");
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
