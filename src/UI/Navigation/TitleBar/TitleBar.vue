<!-- <link rel="stylesheet" href="dist/sl-vue-tree-dark.css">
<script src="dist/sl-vue-tree.js"></script> -->

<template>
  <div class="title" :style="indentStyle">
    <!-- expand icon -->
    <IconSwitcher
      v-if="treeDatum.nodes"
      class="title-element clickable"
      :useFirst="treeDatum.treeExpanded"
      :iconID1="['fa', 'angle-down']"
      :iconID2="['fa', 'angle-right']"
      :width="15"
      @click="toggleExpand(treeDatumID)"
    />
    <div v-else :style="flexFixedWidth(15)"></div>

    <!-- item icon -->
    <!-- <IconSwitcher
      class="title-element clickable"
      :useFirst="treeDatum.nodes !== undefined"
      :iconID1="['far', 'folder']"
      :iconID2="['far', 'file']"
      :width="18"
      @click="titleClick(treeDatumID)"
    /> -->

    <!-- title text -->
    <div 
      class="title-text clickable" 
      @click="titleClick(treeDatumID)"
      :style="treeDatum.visible ? '' : 'color: lightgray;'">
      {{ treeDatum.title }}
    </div>

    <!-- menu-item buttons -->
    <IconBar :width="52">
      <!-- the eye icon should always be farthest to the right, so list it first -->
      <IconSwitcher
        class="title-element clickable"
        :useFirst="treeDatum.visible"
        :iconID1="['far', 'eye']"
        :iconID2="['far', 'eye-slash']"
        :icon2Style="{color: 'lightgray'}"
        :width="24"
        @click="toggleVisible(treeDatumID)"
      />
      <IconSwitcher
      v-if="treeDatum.visible"
        class="title-element clickable"
        :useFirst="treeDatum.focused"
        :iconID1="['fa', 'arrows-to-eye']"
        :iconID2="['fa', 'arrows-to-eye']"
        :icon2Style="{color: 'lightgray'}"
        :width="24"
        @click="toggleFocused(treeDatumID)"
      />
    </IconBar>
  </div>
</template>

<script lang="ts">

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import IconSwitcher from "@/UI/Navigation/TitleBar/IconBar/IconSwitcher.vue";
import IconBar from "@/UI/Navigation/TitleBar/IconBar/IconBar.vue";
import { IMolContainer, MolType } from "../TreeView/TreeInterfaces";
import { getNodeOfId, getAllNodesFlattened } from "../TreeView/TreeUtils";
import { flexFixedWidthStyle } from "../TitleBar/IconBar/IconBarUtils";

@Options({
  components: {
    IconSwitcher,
    IconBar,
  },
})
export default class TitleBar extends Vue {
  @Prop({ required: true }) treeDatum!: IMolContainer;
  @Prop({ default: 0 }) depth!: number;
  @Prop({ default: undefined}) treeData!: IMolContainer[];

  get treeDatumID(): MolType {
    return this.treeDatum.id as MolType;
  }

  flexFixedWidth(width: number): string {
    return flexFixedWidthStyle(width);
  }

  get indentStyle(): string {
    return `margin-left:${8 * this.depth}px`;
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
        for (let node2 of getAllNodesFlattened(node.nodes)) {
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
      this.$store.commit("clearFocusedMolecule");
    } else {
      // Otherwise, focus only on the one you clicked.
      for (let node of getAllNodesFlattened(allData)) {
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
</style>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.title {
  display: flex;
}

.title-element {
  margin-right: 2px;
  display: block;
  float: right;
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
