<template>
  <div
    v-for="treeDatum in getLocalTreeData"
    v-bind:key="treeDatum.id"
    :data-molid="treeDatum.id"
    :style="styleToUse"
  >
    <TitleBar :treeDatum="treeDatum" :depth="depth" :treeData="treeData" />

    <!-- Show sub-items if appropriate -->
    <!-- <Transition name="slide"> -->
    <TreeView
      v-if="treeDatum.nodes && treeDatum.treeExpanded"
      :treeData="treeDatum.nodes"
      :depth="depth + 1"
      :styleToUse="indentStyle"
      :ref="treeDatum.id"
    />
    <!-- </Transition> -->
  </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import IconSwitcher from "@/UI/Navigation/TitleBar/IconBar/IconSwitcher.vue";
import IconBar from "@/UI/Navigation/TitleBar/IconBar/IconBar.vue";
import { flexFixedWidthStyle } from "@/UI/Navigation/TitleBar/IconBar/IconBarUtils";
import TitleBar from "@/UI/Navigation/TitleBar/TitleBar.vue";

/**
 * TreeView component
 */
@Options({
  components: {
    IconSwitcher,
    IconBar,
    TitleBar,
  },
})
export default class TreeView extends Vue {
  @Prop({ default: 0 }) depth!: number;
  @Prop({ default: undefined }) treeData!: Array<any>;
  @Prop({ default: undefined }) styleToUse!: string;

  /**
   * Get the style for a fixed-width element.
   * 
   * @param {number} width  The width of the element.
   * @returns {string}  The style for the element.
   */
  flexFixedWidth(width: number): string {
    return flexFixedWidthStyle(width);
  }

  // @Watch("treeData")
  // onTreeDataChange(newValue: any) {
  //   alert("changed");
  // }

  /**
   * Get the indent style for the title bar.
   * 
   * @returns {string} The indent style for the title bar.
   */
  get indentStyle(): string {
    return `margin-left:${8 * this.depth}px`;
  }

  /**
   * Get the molecules from the vuex store.
   * 
   * @returns {any} The molecules from the vuex store.
   */
  get storeMolecules(): any {
    return this.$store.state["molecules"];
  }

  /**
   * Get the local tree data.
   * 
   * @returns {any} The local tree data.
   */
  get getLocalTreeData(): any {
    if (!this.treeData) {
      return this.storeMolecules;
    }
    return this.treeData;
  }
}
</script>

<style lang="scss">
</style>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
// See https://codepen.io/kdydesign/pen/VrQZqx
$transition-time: 0.2s;
.slide-enter-active {
  -moz-transition-duration: $transition-time;
  -webkit-transition-duration: $transition-time;
  -o-transition-duration: $transition-time;
  transition-duration: $transition-time;
  -moz-transition-timing-function: ease-in;
  -webkit-transition-timing-function: ease-in;
  -o-transition-timing-function: ease-in;
  transition-timing-function: ease-in;
}

.slide-leave-active {
  -moz-transition-duration: $transition-time;
  -webkit-transition-duration: $transition-time;
  -o-transition-duration: $transition-time;
  transition-duration: $transition-time;
  -moz-transition-timing-function: cubic-bezier(0, 1, 0.5, 1);
  -webkit-transition-timing-function: cubic-bezier(0, 1, 0.5, 1);
  -o-transition-timing-function: cubic-bezier(0, 1, 0.5, 1);
  transition-timing-function: cubic-bezier(0, 1, 0.5, 1);
}

.slide-enter-to,
.slide-leave {
  max-height: 100px;
  overflow: hidden;
}

.slide-enter,
.slide-leave-to {
  overflow: hidden;
  max-height: 0;
}
</style>
