<!-- <link rel="stylesheet" href="dist/sl-vue-tree-dark.css">
<script src="dist/sl-vue-tree.js"></script> -->

<template>
  <div>
    <span v-for="treeDatum in getLocalTreeData" v-bind:key="treeDatum.id">
      <TitleBar :treeDatum="treeDatum" :depth="depth" :treeData="treeData" />

      <!-- Show sub-items if appropriate -->
      <Transition name="slide">
        <div
          v-if="treeDatum.nodes && treeDatum.treeExpanded"
          :style="indentStyle"
          :class="'depth-' + depth"
          :ref="treeDatum.id"
          @mousemove.stop="recordMouseMove(depth)"
        >
          <TreeView
            :treeData="treeDatum.nodes"
            :depth="depth + 1"
            @onMouseMovedDepth="onMouseMovedDepth"
          />
        </div>
      </Transition>
    </span>
  </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import { getAllNodesFlattened, getNodeOfId } from "./TreeUtils";
import IconSwitcher from "@/UI/Navigation/TitleBar/IconBar/IconSwitcher.vue";
import IconBar from "@/UI/Navigation/TitleBar/IconBar/IconBar.vue";
import { flexFixedWidthStyle } from "@/UI/Navigation/TitleBar/IconBar/IconBarUtils";
import TitleBar from "@/UI/Navigation/TitleBar/TitleBar.vue";

// @ts-ignore
import Sortable from "sortablejs";

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
  @Prop({ default: 0 }) depthDraggable!: Array<any>;

  sortables: any[] = [];

  onMouseMovedDepth(depth: number) {
    if (this.depth === 0) {
      // Emit has "bubbled up" to the top-most level.
      console.log(depth);

    } else {
      // Propogate emit to the parent.
      this.recordMouseMove(depth);
    }
    // this.$emit("onMouseMovedDepth", depth);
  }

  recordMouseMove(depth: number) {
    this.$emit("onMouseMovedDepth", depth);
    this.onMouseMovedDepth(depth);

    // console.log("depth: " + depth.toString());
  }

  @Watch("depthDraggable")
  onDepthDraggableChange(newDepth: number) {
    debugger;
    for (let sortable of this.sortables) {
      switch (newDepth) {
        case 0:
          sortable.options.filter = ".depth-1";
          break;
        case 1:
          sortable.options.filter = ".depth-0";
          break;
      }
    }
  }

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

  @Watch("getLocalTreeData", { deep: true })
  onGetLocalTreeDataChange(newValue: any) {
    // console.log(this.depth);
    if (this.depth !== 0) {
      // 0 is like proteins
      // 1 is like chains
      return;
    }

    // Need to make new list sortable.
    for (let sortable of this.sortables) {
      sortable.destroy();
    }

    this.sortables = [];

    this.$nextTick(() => {
      // Let list render
      for (let treeDatum of this.getLocalTreeData) {
        let el = this.$refs[treeDatum.id] as HTMLElement[];
        if (el === undefined) {
          continue;
        }
        let sortable = Sortable.create(el[0], {
          fallbackOnBody: true,
          dragoverBubble: true,
          group: "molecules",
          handle: ".title-text",
          filter: "",
          onFilter: (evt: any) => {
            console.log("start");
            // debugger;
          },
        });
        this.sortables.push(sortable);

        // sortable.options.filter = "";

        // debugger;
      }
    });
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
      // Otherwise, focus only on the one you clicked.
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
