<template>
  <div
    data-type="component"
    :data-title="name"
    :data-componentState="processedState"
    :data-width="width"
    :data-height="height"
  >
    <div :id="randomID" class="tab-pane fade show active container-fluid p-3">
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
    height: Number
  },
})
export default class GoldenLayoutComponent extends Vue {
  name!: string;
  state!: string;
  width!: number;
  height!: number;

  pickedRandomID: string = "";

  // computed randomID
  get randomID() {
    return slugify(this.name);
    // if (this.pickedRandomID === "") {
    //   // Create random id comprised only of letters
    //   this.pickedRandomID = (
    //     Math.random().toString(36).substring(2, 15) +
    //     Math.random().toString(36).substring(2, 15)
    //   ).replace(/[^a-z]+/g, "");
    // }
    // return this.pickedRandomID;
  }

  get processedState() {
    let obj = JSON.parse(this.state);
    return JSON.stringify({
      ...obj,
      domID: this.randomID
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
