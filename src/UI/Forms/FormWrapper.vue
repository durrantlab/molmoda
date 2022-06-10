<template>
  <div class="mb-3">
    <label v-if="label !== ''" :for="randomID" class="form-label">{{
      label
    }}</label>
    <div :id="randomID" :aria-label="label" :title="label">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

@Options({
  props: {},
  components: {},
})
export default class FormWrapper extends Vue {
  @Prop({ default: "" }) label!: string;

  get randomID(): string {
    return (
      "a" +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss"></style>
