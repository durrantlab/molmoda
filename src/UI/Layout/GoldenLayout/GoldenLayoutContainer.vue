<template>
  <div :data-type="type" :data-width="width" :data-height="height">
    <slot></slot>
  </div>
</template>

<script lang="ts">

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

/**
 * GoldenLayoutContainer component
 */
@Options({})
export default class GoldenLayoutContainer extends Vue {
  @Prop() name!: string;
  @Prop() title!: string;
  @Prop() type!: string;
  @Prop() width!: number;
  @Prop() height!: number;

  /** mounted function */
  mounted() {
    // Type must be 'row', 'column', or 'stack'.
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
