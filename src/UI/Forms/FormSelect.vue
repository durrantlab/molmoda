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
      v-for="opt in options"
      :value="slugify(opt)"
      v-bind:key="slugify(opt)"
    >
      {{opt}}
    </option>
  </select>
</template>

<script lang="ts">
/* eslint-disable */

import { slugify } from "@/Core/Utils";
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

@Options({
  components: {},
})
export default class FormSelect extends Vue {
  @Prop({ required: true }) modelValue!: string;

  @Prop({ required: true }) id!: string;
  @Prop({ default: false }) disabled!: boolean;
  @Prop({ required: true }) options!: string[];

  handleInput(e: any) {
    this.$emit("update:modelValue", e.target.value);
    this.$emit("changed");
  }

  slugify(v: string): string {
    return slugify(v);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss"></style>
