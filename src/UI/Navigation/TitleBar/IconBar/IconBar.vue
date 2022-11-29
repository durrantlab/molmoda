<template>
  <div :class="'btn-bar ' + extraStyles" :style="flexFixedWidth(width)">
    <slot></slot>
  </div>
</template>

<script lang="ts">

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { flexFixedWidthStyle } from "./IconBarUtils";

/**
 * IconBar component
 */
@Options({
  components: {},
})
export default class IconBar extends Vue {
  @Prop({ required: true }) width!: number;
  @Prop({ default: "" }) class!: string;
  @Prop({ default: "" }) extraStyles!: string;

  /**
   * Get the style for a fixed-width element.
   * 
   * @param {number} width  The width of the element.
   * @returns {string}  The style for the element.
   */
  flexFixedWidth(width: number): string {
    return flexFixedWidthStyle(width);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
.btn-bar .title-element svg {
  margin-left: auto;
  margin-right: auto;
  display: flex;
  margin-top: 4px;
}
</style>
