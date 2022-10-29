<!-- <link rel="stylesheet" href="dist/sl-vue-tree-dark.css">
<script src="dist/sl-vue-tree.js"></script> -->

<template>
  <div
    class="title"
    :style="indentStyle + selectedStyle(treeDatumID)"
    :data-label="treeDatum.title"
    @click="titleBarClick"
  >
    <!-- expand icon -->
    <IconSwitcher
      v-if="treeDatum.nodes"
      class="title-element clickable expand-icon"
      :useFirst="treeDatum.treeExpanded"
      :iconID1="['fa', 'angle-down']"
      :iconID2="['fa', 'angle-right']"
      :width="15"
      @click="toggleExpand(treeDatumID)"
    />
    <div v-else :style="flexFixedWidth(7)"></div>

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
      :style="treeDatum.visible ? '' : 'color: lightgray;'"
    >
      {{ treeDatum.title }}
      <span v-if="treeDatum.nodes">({{ treeDatum.nodes?.length }})</span>
    </div>

    <!-- menu-item buttons -->
    <IconBar :width="24 * Object.keys(iconsToDisplay).length">
      <!-- the eye icon should always be farthest to the right, so list it first -->
      <IconSwitcher
        class="title-element clickable"
        :useFirst="treeDatum.visible"
        :iconID1="['far', 'eye']"
        :iconID2="['far', 'eye-slash']"
        :icon2Style="{ color: 'lightgray' }"
        :width="22"
        @click="toggleVisible(treeDatumID)"
        title="Visible"
      />
      <IconSwitcher
        v-if="iconsToDisplay.focused"
        class="title-element clickable"
        :useFirst="treeDatum.focused"
        :iconID1="['fa', 'arrows-to-eye']"
        :iconID2="['fa', 'arrows-to-eye']"
        :icon2Style="{ color: 'lightgray' }"
        :width="22"
        @click="toggleFocused(treeDatumID)"
        title="Focus"
      />
      <IconSwitcher
        v-if="iconsToDisplay.delete"
        class="title-element clickable"
        :useFirst="true"
        :iconID1="['far', 'rectangle-xmark']"
        :iconID2="['far', 'rectangle-xmark']"
        :width="22"
        @click="deleteMol(treeDatumID)"
        title="Delete"
      />
      <IconSwitcher
        v-if="iconsToDisplay.cloneExtract"
        class="title-element clickable"
        :useFirst="true"
        :iconID1="['far', 'clone']"
        :iconID2="['far', 'clone']"
        :width="22"
        @click="cloneExtractMol(treeDatumID)"
        title="Clone/Extract"
      />
      <IconSwitcher
        v-if="iconsToDisplay.rename"
        class="title-element clickable"
        :useFirst="true"
        :iconID1="['fa', 'pencil']"
        :iconID2="['fa', 'pencil']"
        :width="22"
        @click="renameMol(treeDatumID)"
        title="Rename"
      />
      <!-- 
        :icon2Style="{ color: 'lightgray' }" -->
    </IconBar>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import IconSwitcher from "@/UI/Navigation/TitleBar/IconBar/IconSwitcher.vue";
import IconBar from "@/UI/Navigation/TitleBar/IconBar/IconBar.vue";
import {
  IMolContainer,
  MolType,
  SelectedType,
} from "../TreeView/TreeInterfaces";
import { getNodeOfId, getAllNodesFlattened } from "../TreeView/TreeUtils";
import { flexFixedWidthStyle } from "../TitleBar/IconBar/IconBarUtils";
import Tooltip from "@/UI/MessageAlerts/Tooltip.vue";
import * as api from "@/Api";
import { dynamicImports } from "@/Core/DynamicImports";

interface IIconsToDisplay {
  visible?: boolean;
  focused?: boolean;
  rename?: boolean;
  cloneExtract?: boolean;
  delete?: boolean;
}

/**
 * TitleBar component
 */
@Options({
  components: {
    IconSwitcher,
    IconBar,
    Tooltip,
  },
})
export default class TitleBar extends Vue {
  @Prop({ required: true }) treeDatum!: IMolContainer;
  @Prop({ default: 0 }) depth!: number;
  @Prop({ default: undefined }) treeData!: IMolContainer[];

  /**
   * Get the id of the molecule (node).
   *
   * @returns {string} The id of the molecule (node).
   */
  get treeDatumID(): MolType {
    return this.treeDatum.id as MolType;
  }

  /**
   * Get the indent style for the title bar.
   *
   * @returns {string} The indent style for the title bar.
   */
  get indentStyle(): string {
    return `margin-left:${8 * this.depth}px;`;
  }

  /**
   * Get the data associated with this.treeData.
   *
   * @returns {any}  The data associated with this.treeData.
   */
  get getLocalTreeData(): any {
    if (!this.treeData) {
      return this.$store.state["molecules"];
    }
    return this.treeData;
  }

  /**
   * Determine which icons to display.
   *
   * @returns {IIconsToDisplay} Information about the icons to display.
   */
  get iconsToDisplay(): IIconsToDisplay {
    let toDisplay: IIconsToDisplay = {};

    // Always visible toggle
    toDisplay.visible = true;

    // If visible, also focus icon
    if (this.treeDatum.visible) {
      toDisplay.focused = true;
    }

    // If selected, add rename, extract, copy icons
    if (this.isSelected(this.treeDatumID)) {
      toDisplay.rename = true;
      toDisplay.cloneExtract = true;
      toDisplay.delete = true;
    }

    return toDisplay;
  }

  /**
   * Get the style for a fixed-width element.
   *
   * @param {number} width  The width of the element.
   * @returns {string}  The style for the element.
   */
  flexFixedWidth(width: number): string {
    return flexFixedWidthStyle(width);
  }

  /**
   * The background style to use, depending on whether the molecule is selected.
   *
   * @param {string} id  The id of the selected molecule (node).
   * @returns {string}  The style.
   */
  selectedStyle(id: string): string {
    let node = this.getNode(id);
    return node.selected !== SelectedType.False
      ? "background-color: #f0f0f0;"
      : "";
  }

  // selectedClass(id: string): string {
  //   let node = this.getNode(id);
  //   return node.selected !== SelectedType.FALSE
  //     ? "bg-primary text-white"
  //     : "";
  // }

  /**
   * Whether a molecule is selected.
   *
   * @param {string} id The id of the molecule (node).
   * @returns {boolean} Whether the molecule is selected.
   */
  isSelected(id: string): boolean {
    let node = this.getNode(id);
    return node.selected === SelectedType.True;
  }

  /**
   * Get the node with the given id.
   *
   * @param {string} id  The id of the node.
   * @returns {any}  The node with the given id.
   */
  getNode(id: string): any {
    return getNodeOfId(id, this.getLocalTreeData);
  }

  /**
   * Runs when the title part is clicked. Starts loading openbabel and rdkitjs.
   * These take a while, so good to start the process now.
   */
  titleBarClick() {
    // If they click on the title bar, start loading openbabel and rdkitjs. It's
    // increasingly likely that these will be needed in a bit.
    dynamicImports.openbabeljs.module;
    dynamicImports.rdkitjs.module;
  }

  /**
   * Expand or collapse a molecule (node).
   *
   * @param {string} id  The id of the molecule (node).
   */
  toggleExpand(id: string) {
    let node = this.getNode(id);
    if (node !== null) {
      node.treeExpanded = !node.treeExpanded;
    }
  }

  /**
   * Toggle whether a molecule is visible.
   *
   * @param {string} id  The id of the molecule (node).
   */
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

  /**
   * Toggle whether a molecule is focused.
   *
   * @param {string} id  The id of the molecule (node).
   */
  toggleFocused(id: string) {
    let allData = this.$store.state["molecules"];
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

  /**
   * Rename a molecule.
   *
   * @param {string} id  The id of the molecule (node).
   */
  renameMol(id: string) {
    api.plugins.runPlugin("renamemol", id);
  }

  /**
   * Clone a molecule.
   *
   * @param {string} id  The id of the molecule (node).
   */
  cloneExtractMol(id: string) {
    api.plugins.runPlugin("cloneextractmol", id);
  }

  /**
   * Delete a molecule.
   *
   * @param {string} id  The id of the molecule (node).
   */
  deleteMol(id: string) {
    api.plugins.runPlugin("deletemol", id);
  }

  /**
   * Runs when the user clicks the title.
   *
   * @param {string} id  The id of the molecule (node).
   */
  titleClick(id: string) {
    let node = this.getNode(id);
    let deselectOnly = node.selected === SelectedType.True;

    // System should unselect all nodes.
    for (let nd of getAllNodesFlattened(this.$store.state.molecules)) {
      nd.selected = SelectedType.False;
    }

    if (deselectOnly) {
      return;
    }

    node.selected = SelectedType.True;

    // Children too
    if (node.nodes) {
      for (let nd of getAllNodesFlattened(node.nodes)) {
        nd.selected = SelectedType.ChildOfTrue;
      }
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

<style lang="scss">
</style>