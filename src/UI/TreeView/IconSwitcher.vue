<template>
  <div
    :style="flexFixedWidth"
    class="title-element"
  >
    <div v-if="useFirst"><font-awesome-icon :icon="iconID1" /></div>
    <div v-else><font-awesome-icon :icon="iconID2" /></div>
  </div>
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";

@Options({
  props: {
    useFirst: {
      type: Boolean,
      required: true,
    },
    iconID1: {
      type: Array,
      required: true,
    },
    iconID2: {
      type: Array,
      required: true,
    },
    width: {
      type: Number,
      default: 15
    }
  },
  components: {},
})
export default class IconSwitcher extends Vue {
  useFirst!: boolean;
  iconID1!: Array<string>;
  iconID2!: Array<string>;
  width!: number;

  get flexFixedWidth(): string {
    return `flex:0; max-width:${this.width}px; min-width:${this.width}px;`;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
</style>
