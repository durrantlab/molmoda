<template>
  <div
    data-type="component"
    :data-title="name"
    :data-componentState="processedState"
    :data-width="width"
    :data-height="height"
  >
    <div :id="slugID" :style="style" class="tab-pane fade show active container-fluid p-3">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { slugify } from "@/Core/Utils";

@Options({})
export default class GoldenLayoutComponent extends Vue {
  @Prop() name!: string;
  @Prop() state!: string;
  @Prop() width!: number;
  @Prop() height!: number;
  @Prop() style!: string;

  // computed slugID
  get slugID() {
    return slugify(this.name);
  }

  get processedState() {
    let obj = JSON.parse(this.state);
    return JSON.stringify({
      ...obj,
      domID: this.slugID
    });
  }
}
</script>

<style lang="scss">
#molecules .list-group-item {
  border: 0 !important;
  padding: 0;
  cursor:pointer;
}
</style>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.container-fluid {
  // padding: 0;
  overflow-y: scroll;
}
</style>
