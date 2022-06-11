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
import { slugify } from "../../Core/Utils";

@Options({
  props: {
    name: String,
    state: String, // JSON
    width: Number,
    height: Number,
    style: String,
  },
})
export default class GoldenLayoutComponent extends Vue {
  name!: string;
  state!: string;
  width!: number;
  height!: number;
  style!: string;

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
