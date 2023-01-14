<template>
  <div
    data-type="component"
    :data-title="name"
    :data-componentState="processedState"
    :data-width="width"
    :data-height="height"
  >
    <div
      :id="slugID"
      :style="style + '; height:100%;'"
      :class="
        'tab-pane fade show active container-fluid p-' +
        paddingSize.toString() +
        ' ' +
        extraClass
      "
    >
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { slugify } from "@/Core/Utils";

/**
 * GoldenLayoutComponent component
 */
@Options({})
export default class GoldenLayoutComponent extends Vue {
  @Prop() name!: string;
  @Prop() state!: string;
  @Prop() width!: number;
  @Prop() height!: number;
  @Prop() style!: string;
  @Prop({ default: "" }) extraClass!: string;
  @Prop({ default: 2 }) paddingSize!: number;

  /**
   * get the computed slugID.
   * 
   * @returns {string} The slugID.
   */
  get slugID(): string {
    return slugify(this.name);
  }

  /**
   * Get the processed state.
   *
   * @returns {string} The processed state as a JSON string.
   */
  get processedState(): any {
    let obj = JSON.parse(this.state);
    return JSON.stringify({
      ...obj,
      domID: this.slugID,
    });
  }
}
</script>

<style lang="scss">
#navigator .list-group-item {
  border: 0 !important;
  padding: 0;
  cursor: pointer;
}
</style>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
