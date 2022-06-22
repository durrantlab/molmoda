<!-- <link rel="stylesheet" href="dist/sl-vue-tree-dark.css">
<script src="dist/sl-vue-tree.js"></script> -->

<template>
  <span v-for="treeDatum in getLocalTreeData" v-bind:key="treeDatum.id">
    <div class="title" :style="indentStyle">
      <!-- expand icon -->
      <IconSwitcher
        v-if="treeDatum.nodes"
        class="title-element clickable"
        :useFirst="treeDatum.treeExpanded"
        :iconID1="['fa', 'angle-down']"
        :iconID2="['fa', 'angle-right']"
        :width="15"
        @click="toggleExpand(treeDatum.id)"
      />
      <div v-else :style="flexFixedWidth(15)"></div>

      <!-- item icon -->
      <!-- <IconSwitcher
        class="title-element clickable"
        :useFirst="treeDatum.nodes !== undefined"
        :iconID1="['far', 'folder']"
        :iconID2="['far', 'file']"
        :width="18"
        @click="titleClick(treeDatum.id)"
      /> -->

      <!-- title text -->
      <div 
        class="title-text clickable" 
        @click="titleClick(treeDatum.id)"
        :style="treeDatum.visible ? '' : 'color: lightgray;'">
        {{ treeDatum.text }}
      </div>

      <!-- menu-item buttons -->
      <div class="btn-bar" :style="flexFixedWidth(52)">
        <IconSwitcher
          class="title-element clickable"
          :useFirst="treeDatum.visible"
          :iconID1="['far', 'eye']"
          :iconID2="['far', 'eye-slash']"
          :icon2Style="{color: 'lightgray'}"
          :width="24"
          @click="toggleVisible(treeDatum.id)"
        />
        <IconSwitcher
          class="title-element clickable"
          :useFirst="treeDatum.focused"
          :iconID1="['fa', 'arrows-to-eye']"
          :iconID2="['fa', 'arrows-to-eye']"
          :icon2Style="{color: 'lightgray'}"
          :width="24"
          @click="toggleFocused(treeDatum.id)"
        />
        <!-- @click="toggleExpand(treeDatum.id)" -->
      </div>
    </div>

    <!-- Show sub-items if appropriate -->
    <Transition name="slide">
      <div
        v-if="treeDatum.nodes && treeDatum.treeExpanded"
        :style="indentStyle"
      >
        <TreeView :treeData="treeDatum.nodes" :depth="depth + 1" />
      </div>
    </Transition>
  </span>
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
// import { Watch } from "vue-property-decorator";
import { getAllNodes, getNodeOfId } from "./TreeUtils";
import IconSwitcher from "./IconSwitcher.vue";

@Options({
  components: {
    IconSwitcher,
  },
})
export default class TreeView extends Vue {
  @Prop({ default: 0 }) depth!: number;
  @Prop({ default: undefined }) treeData!: Array<any>;

  get indentStyle(): string {
    return `margin-left:${8 * this.depth}px`;
  }

  flexFixedWidth(width: number): string {
    return `flex:0; max-width:${width}px; min-width:${width}px;`;
  }

  get getLocalTreeData(): any {
    if (!this.treeData) {
      return this.$store.state["molecules"];
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
        for (let node2 of getAllNodes(node.nodes)) {
          node2.visible = newVisible;
          node2.viewerDirty = true;
        }
      }
    }
  }

  toggleFocused(id: string) {
    let allData = this.$store.state["molecules"];
    if (this.getNode(id).focused) {
      // If the one you're clicking is already focused, then unfocus all.
      for (let node of getAllNodes(allData)) {
        node.focused = false;
      }
    } else {
      // Otherwise, focus only on the one you clicked.
      for (let node of getAllNodes(allData)) {
        node.focused = (node.id === id);
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
.btn-bar .title-element svg {
  margin-left: auto;
  margin-right: auto;
  display: flex;
  margin-top: 4px;
}
</style>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.title {
  display: flex;
}

.title-element {
  margin-right: 2px;
  display: inline-block;
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
