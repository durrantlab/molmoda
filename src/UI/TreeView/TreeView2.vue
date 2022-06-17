<!-- <link rel="stylesheet" href="dist/sl-vue-tree-dark.css">
<script src="dist/sl-vue-tree.js"></script> -->

<template>
  <span v-for="treeDatum in getTreeData" v-bind:key="treeDatum.id">
    <div class="title" :style="indentStyle">
      <!-- expand icon -->
      <IconSwitcher
        v-if="treeDatum.nodes"
        class="title-element clickable"
        :useFirst="treeDatum.treeShow"
        :iconID1="['fa', 'angle-down']"
        :iconID2="['fa', 'angle-right']"
        :width="15"
        @click="toggleShow(treeDatum.id)"
      />
      <div v-else :style="flexFixedWidth(15)"></div>

      <!-- item icon -->
      <IconSwitcher
        class="title-element clickable"
        :useFirst="treeDatum.nodes !== undefined"
        :iconID1="['far', 'folder']"
        :iconID2="['far', 'file']"
        :width="18"
        @click="titleClick(treeDatum.id)"
      />

      <!-- title text -->
      <div class="title-text clickable" @click="titleClick(treeDatum.id)">
        {{ treeDatum.text }}
      </div>

      <!-- menu-item buttons -->
      <div class="btn-bar" :style="flexFixedWidth(35)">BTN</div>
    </div>

    <!-- Show sub-items if appropriate -->
    <Transition name="slide">
      <div v-if="treeDatum.nodes && treeDatum.treeShow" :style="indentStyle">
        <TreeView2 :treeData="treeDatum.nodes" :depth="depth + 1" />
      </div>
    </Transition>
  </span>
</template>

<script lang="ts">
/* eslint-disable */

import { addVueXStoreModule } from "@/Store";

import { Options, Vue } from "vue-class-component";
import { Watch } from "vue-property-decorator";
import { getNodeOfId } from "./TreeUtils";
import IconSwitcher from "./IconSwitcher.vue";

addVueXStoreModule("treeview", {
  treeData: [],
});

@Options({
  props: {
    depth: {
      type: Number,
      default: 0,
    },
    treeData: {
      type: Array,
      default: undefined,
    },
  },
  components: {
    IconSwitcher,
  },
})
export default class TreeView2 extends Vue {
  depth!: number;
  treeData!: any;

  get indentStyle(): string {
    return `margin-left:${8 * this.depth}px`;
  }

  flexFixedWidth(width: number): string {
    return `flex:0; max-width:${width}px; min-width:${width}px;`;
  }

  get getTreeData(): any {
    if (!this.treeData) {
      return this.$store.state["treeview"]["treeData"];
    }

    return this.treeData;
  }

  getNode(id: string): any {
    return getNodeOfId(id, this.getTreeData);
  }

  toggleShow(id: string) {
    let node = this.getNode(id);
    if (node !== null) {
      node.treeShow = !node.treeShow;
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

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.title {
  display: flex;
}

.title-element {
  margin-right: 2px;
}

.title-text {
  flex: auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clickable {
  cursor: pointer;
}

.title-text:hover {
  text-decoration: underline;
}

.btn-bar {
  overflow: hidden;
}

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

.slide-enter-to, .slide-leave {
   max-height: 100px;
   overflow: hidden;
}

.slide-enter, .slide-leave-to {
   overflow: hidden;
   max-height: 0;
}
</style>
