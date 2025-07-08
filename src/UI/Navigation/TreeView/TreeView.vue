<template>
    <div class="tree-view-wrapper" ref="scroller" @scroll.passive="handleScroll">
        <FilterInput v-if="allTreeDataFlattened.length > 0 && depth === 0" :list="allTreeDataFlattened"
            :extractTextToFilterFunc="extractTextToFilterFunc" @onFilter="onFilter" mb="1" v-model="filterStr">
        </FilterInput>

        <div v-if="isVirtualizable" :style="sizerStyles">
            <div :style="virtualListStyles">
                <div v-for="(treeDatum, idx) in visibleNodes" :key="treeDatum.id" :data-molid="treeDatum.id"
                    :style="styleToUse" :data-idx="idx + startIndex">
                    <TitleBar :treeDatum="treeDatum" :depth="depth" :treeData="treeData" :filterStr="filterStr" />
                </div>
            </div>
        </div>

        <div v-else>
            <div v-for="(treeDatum, idx) in getLocalTreeData" :key="treeDatum.id" :data-molid="treeDatum.id"
                :style="styleToUse" :data-idx="idx">
                <TitleBar :treeDatum="treeDatum" :depth="depth" :treeData="treeData" :filterStr="filterStr" />
                <TreeView v-if="treeDatum?.nodes && treeDatum?.treeExpanded && filteredTreeNodes === null"
                    :treeData="treeDatum?.nodes" :depth="depth + 1" :styleToUse="indentStyle" :ref="treeDatum?.id" />
            </div>
        </div>
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
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import FilterInput from "@/UI/Components/FilterInput.vue";
import ContextMenu from "../ContextMenu/ContextMenu.vue";

/**
 * TreeView component
 */
@Options({
    components: {
        IconSwitcher,
        IconBar,
        TitleBar,
        FilterInput,
        ContextMenu,
    },
})
export default class TreeView extends Vue {
    @Prop({ default: 0 }) depth!: number;
    @Prop({ default: undefined }) treeData!: TreeNodeList | undefined;
    @Prop({ default: undefined }) styleToUse!: string;
    filteredTreeNodes: TreeNode[] | null = null;
    filterStr = "";
    // VIRTUALIZATION STATE
    itemHeight = 24; // Estimated height of one row (TitleBar)
    scrollTop = 0;
    containerHeight = 0;
    resizeObserver: ResizeObserver | null = null;
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
     * Get the indent style for the title bar.
     *
     * @returns {string} The indent style for the title bar.
     */
    get indentStyle(): string {
        // return `margin-left:${8 * this.depth}px`;
        return "";
    }

    /**
     * Get the molecules from the vuex store.
     *
     * @returns {any} The molecules from the vuex store.
     */
    get storeMolecules(): TreeNodeList {
        return this.$store.state["molecules"];
    }

    /**
     * Get the tree data, with all nodes flattened.
     *
     * @returns {TreeNode[]} The flattened tree data.
     */
    get allTreeDataFlattened(): TreeNode[] {
        return !this.treeData
            ? (this.storeMolecules as TreeNodeList).flattened.toArray()
            : (this.treeData as TreeNodeList).flattened.toArray();
    }

    /**
     * Get the text that will be used for filtering.
     *
     * @param {TreeNode} item  The item to get the text from.
     * @returns {string}  The text to use for filtering.
     */
    extractTextToFilterFunc(item: TreeNode): string {
        return item.title;
    }

    /**
     * Handle the filter event.
     *
     * @param {TreeNode[] | null} filteredNodes  The filtered nodes.
     */
    onFilter(filteredNodes: TreeNode[] | null) {
        this.filteredTreeNodes = filteredNodes;
    }

    /**
     * Get the local tree data.
     *
     * @returns {TreeNode[]} The local tree data. Needs to be converted to
     *     TreeNode[] to be interable in vue.js. If there's no filter, just
     *     return the whole tree as a list. Otherwise, return the filtered
     *     nodes.
     */
    get getLocalTreeData(): TreeNode[] {
        const allTreeData = !this.treeData
            ? (this.storeMolecules as TreeNodeList).toArray()
            : (this.treeData as TreeNodeList).toArray();

        if (this.filteredTreeNodes === null) {
            // No filter. Just return the tree.
            return allTreeData;
        }

        return this.filteredTreeNodes;
    }


    // fixTitle(title: string): string {
    //   // For compounds, remove text and put chain at end.
    //   title = title.replace(/Compounds:(.):(.+)$/g, "$2:$1");
    //   title = title.replace("Compounds:", "");
    //   title = title.replace(/^(.):(.+?):(\d*)$/g, "$2:$3:$1");

    //   // If Any word, :, single letter, remove single letter (using regex)
    //   title = title.replace(/^([^:]+):.$/g, "$1");

    //   return title;
    // }

    // treeChildNodeToUse(curMolCont: TreeNode): TreeNode | null {

    //   return curMolCont;

    //   // NOTE: Below merges children nicely, but I worry is sacrifices clarity for
    //   // conciseness.

    //   // if (curMolCont.nodes === undefined) {
    //   //   // No children (terminal node)
    //   //   return curMolCont;
    //   // }

    //   // if (curMolCont.nodes.length > 1) {
    //   //   // Multiple children
    //   //   return curMolCont;
    //   // }

    //   // if (curMolCont.nodes.length === 0) {
    //   //   // This shouldn't happen. Not a terminal node, but no children.
    //   //   return curMolCont; // null;
    //   // }

    //   // if (!curMolCont.parentId) {
    //   //   // Doing this because I don't want to collapse the names up to the top
    //   //   // one. Stop short of that.
    //   //   return curMolCont;
    //   // }

    //   // if (curMolCont.nodes.length === 1) {
    //   //   if (curMolCont.nodes[0].nodes?.length === 1) {
    //   //     // Single child with single child
    //   //     let title =
    //   //       curMolCont.title +
    //   //       ":" +
    //   //       curMolCont.nodes[0].title +
    //   //       ":" +
    //   //       curMolCont.nodes[0].nodes[0].title;

    //   //     return {
    //   //       ...curMolCont.nodes[0].nodes[0],
    //   //       title: this.fixTitle(title),
    //   //     };
    //   //   }

    //   //   // Single child
    //   //   let title = curMolCont.title + ":" + curMolCont.nodes[0].title;
    //   //   return {
    //   //     ...curMolCont.nodes[0],
    //   //     title: this.fixTitle(title),
    //   //   };
    //   // }

    //   // return curMolCont;
    // }
    /**
     * Determines if the current list is long and flat enough to be virtualized.
     *
     * @returns {boolean} True if virtualization should be used.
     */
    get isVirtualizable(): boolean {
        if (this.depth !== 0) return false;
        if (this.filteredTreeNodes === null) return false;
        return this.filteredTreeNodes.length >= 50;
    }

    /**
     * Calculates the index of the first visible item in the virtualized list.
     *
     * @returns {number} The start index.
     */
    get startIndex(): number {
        return Math.floor(this.scrollTop / this.itemHeight);
    }

    /**
     * Gets the subset of nodes that should be visible in the virtualized list.
     *
     * @returns {TreeNode[]} An array of TreeNodes to render.
     */
    get visibleNodes(): TreeNode[] {
        if (!this.isVirtualizable || !this.filteredTreeNodes) {
            return this.getLocalTreeData;
        }
        const visibleCount = Math.ceil(this.containerHeight / this.itemHeight) + 2;
        const endIndex = Math.min(
            this.startIndex + visibleCount,
            this.filteredTreeNodes.length
        );
        return this.filteredTreeNodes.slice(this.startIndex, endIndex);
    }

    /**
     * Gets the style for the sizer element, which ensures the scrollbar is the correct size.
     *
     * @returns {object} A style object for the sizer div.
     */
    get sizerStyles(): object {
        if (!this.isVirtualizable || !this.filteredTreeNodes) return {};
        return {
            position: "relative",
            height: `${this.filteredTreeNodes.length * this.itemHeight}px`,
        };
    }

    /**
     * Gets the style for the list wrapper, which positions the visible items correctly.
     *
     * @returns {object} A style object for the list wrapper div.
     */
    get virtualListStyles(): object {
        if (!this.isVirtualizable) return {};
        return {
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            transform: `translateY(${this.startIndex * this.itemHeight}px)`,
        };
    }

    /**
     * Handles the scroll event on the root container.
     *
     * @param {UIEvent} event The scroll event.
     */
    handleScroll(event: UIEvent): void {
        if (this.depth === 0) {
            const target = event.target as HTMLElement;
            this.scrollTop = target.scrollTop;
        }
    }

    /**
     * Sets up a ResizeObserver to monitor the size of the scrollable container.
     */
    setupResizeObserver(): void {
        if (this.depth === 0) {
            const scroller = this.$refs.scroller as HTMLElement;
            if (scroller) {
                this.containerHeight = scroller.clientHeight;
                this.resizeObserver = new ResizeObserver((entries) => {
                    if (entries[0]) {
                        this.containerHeight = entries[0].contentRect.height;
                    }
                });
                this.resizeObserver.observe(scroller);
            }
        }
    }

    /**
     * Lifecycle hook: called when the component is mounted.
     */
    mounted() {
        this.setupResizeObserver();
    }

    /**
     * Lifecycle hook: called before the component is unmounted.
     */
    beforeUnmount() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }
}
</script>

<style lang="scss"></style>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.tree-view-wrapper {
    height: 100%;
    overflow-y: auto;
    position: relative;
    /* For sizer/virtual list positioning */
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
