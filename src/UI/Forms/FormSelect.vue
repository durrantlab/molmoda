<template>
  <select
    class="form-select form-select-sm"
    :id="id"
    :disabled="disabled"
    @input="handleInput"
    :value="modelValue"
  >
    <!-- <option selected>Open this select menu</option> -->
    <option
      v-for="opt in optionsToUse"
      :value="opt.val"
      v-bind:key="opt.val"
      :disabled="opt.disabled === true"
    >
      {{opt.description}}
    </option>
  </select>
</template>

<script lang="ts">

import { randomID, slugify } from "@/Core/Utils";
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { IFormOption } from "./FormFull/FormFullInterfaces";

/**
 * FormSelect component
 */
@Options({
  components: {},
})
export default class FormSelect extends Vue {
  @Prop({ required: true }) modelValue!: string;
  @Prop({ default: randomID() }) id!: string;
  @Prop({ default: false }) disabled!: boolean;
  @Prop({ required: true }) options!: (string | IFormOption)[];

  /**
   * Get the options to use in the select.
   * 
   * @returns {IFormOption[]} The options to use.
   */
  get optionsToUse(): IFormOption[] {
    return this.options.map((o: string | IFormOption) => {
      if (typeof o === "string") {
        return {
          description: o,
          val: slugify(o)
        };
      } else {
        return o;
      }
    });
  }

  /**
   * Let the parent component know of any changes.
   *
   * @param {any} e  The value.
   */
  handleInput(e: any) {
    this.$emit("update:modelValue", e.target.value);

    // In some circumstances (e.g., changing values in an object), not reactive.
    // Emit also "onChange" to signal the value has changed.
    this.$emit("onChange", e.target.value);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss"></style>
