<template>
  <input
    :type="type"
    :class="'form-control' + (type === 'color' ? ' form-control-color' : '')"
    :id="id"
    :placeholder="placeHolder"
    :disabled="disabled"
    @input="handleInput"
    :value="modelValue"
  />
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

@Options({
  // props: {
  //   label: String,
  //   id: String,
  //   type: String,
  //   placeHolder: String,
  // },
  components: {},
})
export default class FormInput extends Vue {
  @Prop({ required: true }) modelValue!: any;

  @Prop({ required: true }) id!: string;
  @Prop({ default: "text" }) type!: string;
  @Prop({ default: "placeholder" }) placeHolder!: string;
  @Prop({ default: false }) disabled!: boolean;

  handleInput(e: any) {
    this.$emit('update:modelValue', e.target.value);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss"></style>
