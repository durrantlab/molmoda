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
    >
      {{opt.description}}
    </option>
  </select>
</template>

<script lang="ts">

import { randomID, slugify } from "@/Core/Utils";
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

interface IOption {
  description: string;
  val: any;
}

@Options({
  components: {},
})
export default class FormSelect extends Vue {
  @Prop({ required: true }) modelValue!: string;
  @Prop({ default: randomID() }) id!: string;
  @Prop({ default: false }) disabled!: boolean;
  @Prop({ required: true }) options!: (string | IOption)[];

  get optionsToUse(): IOption[] {
    return this.options.map((o: string | IOption) => {
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

  handleInput(e: any) {
    this.$emit("update:modelValue", e.target.value);

    // In some circumstances (e.g., changing values in an object), not reactive.
    // So emit also "changed" to indicate the value has changed.
    this.$emit("changed");
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss"></style>
