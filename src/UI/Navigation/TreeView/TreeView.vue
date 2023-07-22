<template>
    <span>
        <div
            v-for="(treeDatum, idx) in getLocalTreeData"
            v-bind:key="treeDatum.id"
            :data-molid="treeDatum.id"
            :style="styleToUse"
            :data-idx="idx"
        >
            <!-- {{idx}} -->
            <TitleBar
                :treeDatum="treeDatum"
                :depth="depth"
                :treeData="treeData"
            />

            <!-- Show sub-items if appropriate -->
            <!-- <Transition name="slide"> -->
            <TreeView
                v-if="treeDatum?.nodes && treeDatum?.treeExpanded"
                :treeData="treeDatum?.nodes"
                :depth="depth + 1"
                :styleToUse="indentStyle"
                :ref="treeDatum?.id"
            />
            <!-- </Transition> -->
        </div>
    </span>
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
    @Prop({ default: undefined }) treeData!: TreeNodeList | undefined;
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
     * Get the local tree data.
     *
     * @returns {TreeNode[]} The local tree data. Needs to be converted to
     *     TreeNode[] to be interable in vue.js.
     */
    get getLocalTreeData(): TreeNode[] {
        if (!this.treeData) {
            return (this.storeMolecules as TreeNodeList).toArray();
        }
        return (this.treeData as TreeNodeList).toArray();
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
}
</script>

<style lang="scss"></style>

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
