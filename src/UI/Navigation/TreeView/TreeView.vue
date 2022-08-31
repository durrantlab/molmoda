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
import { getAllNodesFlattened, getNodeOfId } from "./TreeUtils";
import IconSwitcher from "@/UI/Navigation/TitleBar/IconBar/IconSwitcher.vue";
import IconBar from "@/UI/Navigation/TitleBar/IconBar/IconBar.vue";
import { flexFixedWidthStyle } from "@/UI/Navigation/TitleBar/IconBar/IconBarUtils";
import TitleBar from "@/UI/Navigation/TitleBar/TitleBar.vue";

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

  flexFixedWidth(width: number): string {
    return flexFixedWidthStyle(width);
  }

  // @Watch("treeData")
  // onTreeDataChange(newValue: any) {
  //   alert("changed");
  // }

  get indentStyle(): string {
    return `margin-left:${8 * this.depth}px`;
  }

  get storeMolecules(): any {
    return this.$store.state["molecules"];
  }

  get getLocalTreeData(): any {
    if (!this.treeData) {
      return this.storeMolecules;
    }
    return this.treeData;
  }

  getNode(id: string): any {
    return getNodeOfId(id, this.getLocalTreeData);
  }

  toggleExpand(id: string) {
    let node = this.getNode(id);
    if (node !== null) {
      node.treeExpanded = !node.treeExpanded;
    }
  }

  toggleVisible(id: string) {
    let node = this.getNode(id);
    if (node !== null) {
      let newVisible = !node.visible;
      node.visible = newVisible;
      node.viewerDirty = true;
      if (node.nodes) {
        for (let node2 of getAllNodesFlattened(node.nodes)) {
          node2.visible = newVisible;
          node2.viewerDirty = true;
        }
      }
    }
  }

  toggleFocused(id: string) {
    let allData = this.storeMolecules;
    if (this.getNode(id).focused) {
      // If the one you're clicking is already focused, then unfocus all.
      this.$store.commit("clearFocusedMolecule");
    } else {
      // Otherwise, focus on the one you clicked.
      for (let node of getAllNodesFlattened(allData)) {
        node.focused = node.id === id;
      }
    }
  }

  titleClick(id: string) {
    let node = this.getNode(id);
    if (node != null) {
      node.styles = [
        {
          selection: {},
          style: {
            line: {
              color: "red",
            },
          },
        },
      ];
      node.viewerDirty = true;
    }
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
