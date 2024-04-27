<template>
    <ContextMenu
        :options="contextMenuItems"
        @onMenuItemClick="onContextMenuItemClick"
        @onMenuItemRightClick="onContextMenuItemRightClick"
    >
        <div
            :class="'title' + selectedclass(treeDatumID)"
            :style="indentStyle"
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
            <!-- :placement="tipPlacement" -->
            <Tooltip :tip="selInstructions">
                <div
                    class="title-text clickable"
                    @click="titleClick(treeDatumID)"
                    :style="treeDatum.visible ? '' : 'color: lightgray;'"
                >
                    {{ title }}
                    <span v-if="treeDatum.nodes">
                        {{ descendentCounts(treeDatum) }}
                    </span>
                </div>
            </Tooltip>

            <!-- menu-item buttons -->
            <IconBar
                :width="24 * Object.keys(iconsToDisplay).length"
                extraClasses="me-2 selected"
                style="margin-right: 8px"
            >
                <!-- the eye icon should always be farthest to the right, so list it first -->
                <IconSwitcher
                    class="title-element clickable"
                    :useFirst="treeDatum.visible"
                    :iconID1="visibleIconToUse"
                    :iconID2="visibleIconToUse"
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
                    class="title-element clickable delete"
                    :useFirst="true"
                    :iconID1="['far', 'rectangle-xmark']"
                    :iconID2="['far', 'rectangle-xmark']"
                    :width="22"
                    @click="deleteMol(treeDatumID)"
                    title="Delete"
                />
                <IconSwitcher
                    v-if="iconsToDisplay.cloneExtract"
                    class="title-element clickable cloneextract"
                    :useFirst="true"
                    :iconID1="['far', 'clone']"
                    :iconID2="['far', 'clone']"
                    :width="22"
                    @click="cloneMol(treeDatumID)"
                    title="Clone"
                />
                <IconSwitcher
                    v-if="iconsToDisplay.rename"
                    class="title-element clickable rename"
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
    </ContextMenu>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import IconSwitcher from "@/UI/Navigation/TitleBar/IconBar/IconSwitcher.vue";
import IconBar from "@/UI/Navigation/TitleBar/IconBar/IconBar.vue";
import { TreeNodeType, SelectedType } from "../TreeView/TreeInterfaces";
import { flexFixedWidthStyle } from "../TitleBar/IconBar/IconBarUtils";
import Tooltip from "@/UI/MessageAlerts/Tooltip.vue";
import * as api from "@/Api";
import { doSelecting, selectInstructionsBrief } from "./MolSelecting";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import * as LoadedPlugins from "@/Plugins/LoadedPlugins";
import { IMenuItem, IMenuSubmenu } from "../Menu/Menu";
import ContextMenu from "../ContextMenu/ContextMenu.vue";
import { IContextMenuOption } from "../ContextMenu/ContextMenuInterfaces";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";

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
        ContextMenu,
    },
})
export default class TitleBar extends Vue {
    @Prop({ required: true }) treeDatum!: TreeNode;
    @Prop({ default: 0 }) depth!: number;
    @Prop({ default: undefined }) treeData!: TreeNodeList;
    @Prop({ default: "" }) filterStr!: string;

    /**
     * Get the icon to use for the visible toggle.
     *
     * @returns {string[] | string} The icon to use for the visible toggle.
     */
    get visibleIconToUse(): string[] | string {
        // Get all the children of the node.
        const children = this.treeDatum.nodes?.flattened;

        if (!children) return ["far", "fa-eye"];

        let someVisible = undefined as boolean | undefined;
        let someInvisible = undefined as boolean | undefined;

        for (const child of children._nodes) {
            if (child.visible) someVisible = true;
            else someInvisible = true;

            if (someVisible && someInvisible) {
                // You can already tell that it's mixed, so exit early.
                return "half_visible.svg";
            }
        }

        if (someVisible && !someInvisible) {
            // All the children all visible
            this.treeDatum.visible = true;
            return ["far", "fa-eye"];
        }

        // All the children are invisible
        this.treeDatum.visible = false;
        return ["far", "fa-eye-slash"];

        // // If any of the children are not visible, use the half eye-slash icon.
        // if (children?._nodes.some((node) => !node.visible)) {
        //     // return ["far", "fa-rectangle-xmark"];
        //     return "half_visible.svg";
        // }
        // return ['far', 'eye']
    }

    /**
     * Get the string to indicate the number of children and terminals.
     *
     * @param {TreeNode} node The node.
     * @returns {string} The string to indicate the number of children and terminals.
     */
    descendentCounts(node: TreeNode): string {
        const numChildren = node.nodes?.length;
        const numTerminals = node.nodes?.terminals.length;

        // NOTE: This is just to make sure the count is reactive. A silly hack.
        const triggerId = node.nodes?.triggerId;
        if (triggerId === "-234") return "";

        let s = `(${numChildren}`;
        if (numChildren !== numTerminals) {
            s += ` / ${numTerminals}`;
        }
        s += ")";
        return s;
    }

    /**
     * Get the id of the molecule (node).
     *
     * @returns {string} The id of the molecule (node).
     */
    get treeDatumID(): TreeNodeType {
        return this.treeDatum.id as TreeNodeType;
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
     * Get instructions about how to select molecules.
     *
     * @returns {string} Instructions about how to select molecules.
     */
    get selInstructions(): string {
        return selectInstructionsBrief;
    }

    /**
     * Get the title of the molecule (node). Makes some adjustments to the title
     * specified in the TreeNode itself.
     *
     * @returns {string} The title of the molecule (node).
     */
    get title(): string {
        let title = this.treeDatum.title;

        // If there is "(" in the title, update it to : (trying to enforce
        // consistency).
        title = title.replace("(", ":");
        title = title.replace(")", ":");
        while (title.indexOf(" :") !== -1) {
            title = title.replace(" :", ":");
        }
        while (title.indexOf(": ") !== -1) {
            title = title.replace(": ", ":");
        }

        // While it starts with :, remove.
        while (title.startsWith(":")) {
            title = title.slice(1);
        }

        title = title.trim();

        while (title.indexOf("::") !== -1) {
            title = title.replace("::", ":");
        }

        // If ends in :, remove
        if (title.endsWith(":")) {
            title = title.slice(0, title.length - 1);
        }

        return title;
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
    selectedclass(id: string): string {
        let node = this.getNode(id);
        if (node === null) {
            return "";
        }
        return node.selected !== SelectedType.False ? " selected" : "";
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
        if (node === null) {
            return false;
        }
        return node.selected !== SelectedType.False;
    }

    /**
     * Get the node with the given id.
     *
     * @param {string} id  The id of the node.
     * @returns {any}  The node with the given id.
     */
    getNode(id: string): TreeNode | null {
        return (this.getLocalTreeData as TreeNodeList).filters.onlyId(id);
    }

    /**
     * Runs when the title part is clicked. Starts loading openbabel and rdkitjs.
     * These take a while, so good to start the process now.
     */
    titleBarClick() {
        // If they click on the title bar, start loading openbabel and rdkitjs. It's
        // increasingly likely that these will be needed in a bit.
        // dynamicImports.openbabeljs.module;
        // dynamicImports.rdkitjs.module;
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

            // If it has only one terminal node, just expand everything.
            if (node.nodes?.terminals.length === 1) {
                node.nodes.flattened.forEach((node2: TreeNode) => {
                    node2.treeExpanded = true;
                });
            }
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

            // Make this one the appropriate visibility
            node.visible = newVisible;
            node.viewerDirty = true;

            // Similarly update the visibility on all children.
            const children = node.nodes;
            if (children) {
                children.flattened.forEach((node2: TreeNode) => {
                    node2.visible = newVisible;
                    node2.viewerDirty = true;
                });
            }

            // Now also update visibility on anything that is selected, if the
            // current one is selected.
            if (node.selected !== SelectedType.False) {
                const selecteds = getMoleculesFromStore().filters.keepSelected(true, true);
                selecteds.forEach((node2: TreeNode) => {
                    node2.visible = newVisible;
                    node2.viewerDirty = true;
                });
            }
        }
    }

    /**
     * Toggle whether a molecule is focused.
     *
     * @param {string} id  The id of the molecule (node).
     */
    async toggleFocused(id: string) {
        let allData = this.$store.state["molecules"] as TreeNodeList;
        if (this.getNode(id)?.focused) {
            // If the one you're clicking is already focused, then unfocus all.
            this.$store.commit("clearFocusedMolecule");
        } else {
            // Otherwise, focus on the one you clicked.
            allData.flattened.forEach((node: TreeNode) => {
                node.focused = node.id === id;
            });
        }
        const viewer = await api.visualization.viewer;
        viewer.zoomOnFocused();
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
    cloneMol(id: string) {
        api.plugins.runPlugin("clonemol", id);
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
        doSelecting(id, this.getLocalTreeData, this.filterStr);
    }

    // Below are functions useful for the context menu (right click).

    /**
     * Get the items from the edit submenu.
     *
     * @returns {IMenuItem[]} The items from the edit submenu.
     */
    get editMenuItems(): IMenuItem[] {
        const editMenu = LoadedPlugins.allMenuData.filter(
            (m) => m.text === "Edit"
        )[0] as IMenuSubmenu;

        // Collect all the items from the submenus, in one list.
        const allEditItems: IMenuItem[] = [];
        editMenu.items.forEach((item) => {
            for (const subItem of (item as IMenuSubmenu).items) {
                // A few are skipped.
                if (["Undo", "Redo"].includes(subItem.text as string)) {
                    continue;
                }
                allEditItems.push(subItem as IMenuItem);
            }
            allEditItems.push({
                path: "",
                text: "separator",
            } as IMenuItem);
        });

        // Shouldn't start or end with separator
        while (allEditItems[0].text === "separator") {
            allEditItems.shift();
        }
        while (allEditItems[allEditItems.length - 1].text === "separator") {
            allEditItems.pop();
        }
        return allEditItems;
    }

    /**
     * Get the items for the context menu.
     *
     * @returns {IContextMenuOption[]} The items for the context menu.
     */
    get contextMenuItems(): IContextMenuOption[] {
        return this.editMenuItems.map((item) => {
            const checkPluginAllowed = item.checkPluginAllowed;
            const allowed = checkPluginAllowed
                ? checkPluginAllowed(this.$store.state.molecules) === null
                : true;
            return {
                text: item.text as string,
                pluginId: item.pluginId as string,
                enabled: allowed,
                function: item.function,
            } as IContextMenuOption;
        });
    }

    /**
     * Runs when user right clicks. Selects the molecule if it isn't already
     * selected.
     */
    onContextMenuItemRightClick() {
        const id = this.treeDatumID;
        const isSelected = this.isSelected(id);
        // If it isn't selected, select it.
        if (!isSelected) {
            doSelecting(id, this.getLocalTreeData, this.filterStr);
        }
    }

    /**
     * Runs when user clicks on a context menu item.
     *
     * @param {IContextMenuOption} menuItem The menu item that was clicked.
     */
    onContextMenuItemClick(menuItem: IContextMenuOption) {
        if (menuItem && menuItem.function) {
            menuItem.function();
        }
    }
}
</script>

<style lang="scss"></style>

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
    right: 0;
    position: absolute;
    background-color: white;
    padding-bottom: 1px;
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

.selected,
.selected * {
    background-color: #f0f0f0;
}
</style>

<style lang="scss"></style>
