<template>
  <div :data-type="type" :data-width="width" :data-height="height">
    <slot></slot>
  </div>
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";

@Options({
  props: {
    name: String,
    title: String,
    type: String,
    width: Number,
    height: Number
  },
})
export default class GoldenLayoutContainer extends Vue {
  name!: string;
  title!: string;
  type!: string;
  width!: number;
  height!: number;

  // mounted
  mounted() {
    // Validate type. Must be 'row', 'column', or 'stack'.
    if (["row", "column", "stack"].indexOf(this.type) === -1) {
      throw new Error(
        `Invalid type: ${this.type}. Must be 'row', 'column', or 'stack'.`
      );
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
