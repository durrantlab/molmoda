<template>
    <span :class="containerClass" @mousemove="onMouseMove">
        <div id="mol-viewer"></div>
    </span>
</template>

<script lang="ts">
import { Options } from "vue-class-component";

import * as api from "@/Api/";

import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

import { unbondedAtomsStyle } from "@/FileSystem/LoadSaveMolModels/Types/DefaultStyles";
import { Vue } from "vue-class-component";
import { Watch } from "vue-property-decorator";
// import { ViewerNGL } from "./Viewers/ViewerNGL";
import { Viewer3DMol } from "./Viewers/Viewer3DMol";
import {
    loadViewerLibPromise,
    setLoadViewerLibPromise,
} from "./Viewers/ViewerParent";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";

/**
 * ViewerPanel component
 */
@Options({
    components: {},
})
export default class ViewerPanel extends Vue {
    containerClass = "cursor-grab";
    switchToGrabCursorTimer: any = undefined;

    /**
     * Get the molecules from the store. All viewers of any type will need to
     * react to changes in the molecules.
     *
     * @returns {TreeNodeList} the molecules.
     */
    get treeview(): TreeNodeList {
        return this.$store.state["molecules"];
    }

    /**
     * Clears the cursor timeout (which sets the cursor to "grab" after a few
     * seconds.
     */
    clearCursorTimeout() {
        if (this.switchToGrabCursorTimer) {
            clearTimeout(this.switchToGrabCursorTimer);
        }
    }

    /**
     * Handles mouse move events, changing cursor css via classes.
     *
     * @param {MouseEvent} e  The mouse event.
     */
    onMouseMove(e: MouseEvent) {
        // If currently pointing, abandon effort (over atom).
        if (this.containerClass === "cursor-pointer") {
            this.clearCursorTimeout();
            return;
        }

        // Is the mouse button down?
        if (e.buttons !== 0) {
            this.containerClass = "cursor-grabbing";
            this.clearCursorTimeout();
            return;
        }

        this.clearCursorTimeout();
        this.switchToGrabCursorTimer = setTimeout(() => {
            this.containerClass = "cursor-grab";
        }, 5000);
        this.containerClass = "";
    }

    /**
     * Checks if the treeview has changed.
     *
     * @param {TreeNodeList} allMolecules  The new molecules.
     */
    @Watch("treeview", { immediate: false, deep: true })
    onTreeviewChanged(allMolecules: TreeNodeList) {
        setTimeout(() => {
            // Putting it in setTimeout so some components of UI will react
            // immediately. Below can be time consuming in some cases.
            if (loadViewerLibPromise === undefined) {
                if (api.visualization.viewer !== undefined) {
                    // Molecular library already loaded.
                    setLoadViewerLibPromise(
                        Promise.resolve(api.visualization.viewer)
                    );
                } else {
                    // Need to load the molecular library.
                    if (this.$store.state.molViewer === "3dmol") {
                        api.visualization.viewer = new Viewer3DMol();
                    // } else if (this.$store.state.molViewer === "ngl") {
                        // api.visualization.viewer = new ViewerNGL();
                    } else {
                        throw new Error("Unknown viewer");
                    }

                    const promise = api.visualization.viewer
                        .loadAndSetupViewerLibrary(
                            "mol-viewer",
                            (classes: string) => {
                                this.containerClass = classes;
                            }
                        )
                        .then((viewer: any) => {
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            window["viewer"] = viewer;

                            api.visualization.viewer = viewer;
                            this.$emit("onViewerLoaded");
                            return viewer;
                        });

                    setLoadViewerLibPromise(promise);
                }
            }

            (loadViewerLibPromise as Promise<any>)
                .then(() => {
                    if (allMolecules.length === 0) {
                        // No molecules present
                        api.visualization.viewer?.clearCache();
                        return;
                    }

                    // Update and zoom
                    return this._updateStylesAndZoom();
                })
                .catch((err) => {
                    throw err;
                });
        }, 0);
    }

    /**
     * Update the styles and zoom of the molecules.
     *
     * @returns {Promise<any>}  A promise that resolves when the styles and
     *    zoom have been updated.
     */
    private _updateStylesAndZoom(): Promise<any> {
        const spinnerId = api.messages.startWaitSpinner();

        return this._updateStyleChanges()
            .then((visibleTerminalNodeModelsIds) => {
                this._zoomPerFocus(visibleTerminalNodeModelsIds);
                api.messages.stopWaitSpinner(spinnerId);
                return;
            })
            .catch((err) => {
                api.messages.stopWaitSpinner(spinnerId);
                throw err;
            });
    }

    /**
     * Remove models no longer present in the vuex store molecules variables.
     *
     * @param {TreeNodeList} terminalNodes  The terminal nodes of the treeview.
     */
    private _removeOldModels(terminalNodes: TreeNodeList) {
        // Remove any molecules not presently in the terminal nodes.

        // Get the ids of the actual terminal nodes (should have deleted element
        // already removed)
        const idsOfTerminalNodes = terminalNodes.map(
            (node: TreeNode) => node.id
        ) as string[];

        api.visualization.viewer?.removeObjects(idsOfTerminalNodes);
    }

    /**
     * Update the styles of the molecules.
     * 
     * @param {TreeNode} treeNode  The tree node to update.
     * @param {Promise<any>[]} surfacePromises  The promises for the surfaces.
     * @returns {boolean}  True if styles is defined in the end. False otherwise.
     */
    private _clearAndSetStyle(
        treeNode: TreeNode,
        surfacePromises: Promise<any>[]
    ): boolean {
        if (treeNode.styles) {
            // Styles to apply, so make sure it's visible.

            // Clear current styles
            api.visualization.viewer?.clearMoleculeStyles(
                treeNode.id as string
            );

            // Clear any surfaces associated with this molecule.
            api.visualization.viewer?.clearSurfacesOfMol(treeNode.id as string);

            // Add new styles
            let spheresUsed = false;
            for (const style of treeNode.styles) {
                if (!style["surface"]) {
                    // It's a style, not a surface.
                    const convertedStyle =
                        api.visualization.viewer?.convertStyle(style, treeNode);
                    api.visualization.viewer?.setMolecularStyle(
                        treeNode.id as string,
                        api.visualization.viewer?.convertSelection({}),
                        convertedStyle,
                        true
                    );
                    if (style.sphere) {
                        spheresUsed = true;
                    }
                    continue;
                }

                // It's a surface. Mark it for adding later.
                const convertedStyle = api.visualization.viewer?.convertStyle(
                    style,
                    treeNode
                );
                surfacePromises.push(
                    api.visualization.viewer?.addSurface(
                        treeNode.id as string,
                        convertedStyle
                    ) as Promise<any>
                );
            }

            // Regardless of specified style, anything not bound to other molecule
            // should be visible.
            if (treeNode.styles.length > 0 && !spheresUsed) {
                // If there's any style, no style is spheres, make sure unbonded
                // atoms are visible.
                const convertedStyle = api.visualization.viewer?.convertStyle(
                    unbondedAtomsStyle,
                    treeNode
                );
                api.visualization.viewer?.setMolecularStyle(
                    treeNode.id as string,
                    api.visualization.viewer?.convertSelection({
                        bonds: 0,
                    }),
                    convertedStyle,
                    true
                );
            }
        }

        return treeNode.styles !== undefined;
    }

    /**
     * Updates any style changes.
     *
     * @returns {Promise<string[]>}  A promise that resolves the ids of the
     *     molecules that are visible.
     */
    private _updateStyleChanges(): Promise<string[]> {
        if (api.visualization.viewer === undefined) {
            // Not ready yet.
            return Promise.resolve([]);
        }

        let visibleTerminalNodeModelsIds: string[] = [];
        const terminalNodes = this.treeview.filters.onlyTerminal;

        this._removeOldModels(terminalNodes);

        // Add all the models and put them in the cache. This also hides the
        // regions if visible == false on the node.
        const addMolPromises =
            api.visualization.viewer?.addTreeNodeList(terminalNodes);

        // All models now loaded. Style them appropriately.
        return Promise.all(addMolPromises)
            .then((treeNodes: TreeNode[]) => {
                const surfacePromises: Promise<any>[] = [];

                // Keep track of visible molecules so you can zoom on them
                // later.
                visibleTerminalNodeModelsIds = treeNodes
                    .filter((treeNode: TreeNode) => treeNode.visible)
                    .map((treeNode: TreeNode) => treeNode.id as string);

                // Get only the dirty nodes. If the node isn't dirty, there's no
                // need to apply a new style.
                const dirtyNodes = treeNodes.filter(
                    (treeNode: TreeNode) => treeNode.viewerDirty
                );

                // You're about to update the style, so mark it as not dirty.
                dirtyNodes.forEach((treeNode: TreeNode) => {
                    treeNode.viewerDirty = false;
                });

                const visibleDirtyNodes = dirtyNodes.filter(
                    (treeNode: TreeNode) => {
                        const isVisible = treeNode.visible;

                        if (!isVisible) {
                            // Since not supposed to be visible, we won't keep
                            // it in the list. But make sure it's hidden here.

                            // hide it.
                            // console.log("Hiding:" + treeNode.id);
                            api.visualization.viewer?.hideObject(
                                treeNode.id as string
                            );

                            // Clear any surfaces associated with this molecule.
                            api.visualization.viewer?.clearSurfacesOfMol(
                                treeNode.id as string
                            );
                        } else {
                            // Make sure actually visible
                            // console.log("Showing:" + treeNode.id);
                            api.visualization.viewer?.showObject(
                                treeNode.id as string
                            );
                        }

                        return isVisible;
                    }
                );

                for (const treeNode of visibleDirtyNodes) {
                    // There are styles to apply. Apply them.
                    if (this._clearAndSetStyle(treeNode, surfacePromises)) {
                        continue;
                    }

                    // Visible, but no style specified. Is it a region?
                    if (treeNode.region) {
                        api.visualization.viewer?.updateRegionStyle(
                            treeNode.id as string,
                            treeNode.region
                        );
                        continue;
                    }

                    // Visible, no styles, not a region. This should never
                    // happen.
                    api.visualization.viewer?.setMolecularStyle(
                        treeNode.id as string,
                        api.visualization.viewer?.convertSelection({}),
                        api.visualization.viewer?.convertStyle(
                            { line: {} },
                            treeNode
                        )
                    );
                    console.warn("error?");
                }
                return Promise.all(surfacePromises);
            })
            .then(() => {
                return visibleTerminalNodeModelsIds;
            })
            .catch((err) => {
                throw err;
                // return visibleTerminalNodeModelsIds;
            });
    }

    /**
     * Zoom in on the visible molecules.
     *
     * @param {string[]} visibleTerminalNodeModelsIds  The visible models.
     */
    private _zoomPerFocus(visibleTerminalNodeModelsIds: string[]) {
        let molsToFocusIds: string[] = [];
        const flatNodes = this.treeview.flattened;
        for (let idx = 0; idx < flatNodes.length; idx++) {
            const treeNode = flatNodes.get(idx);
            if (treeNode.focused) {
                if (!treeNode.nodes) {
                    // Already terminal
                    molsToFocusIds = [treeNode.id as string];
                } else {
                    const children = treeNode.nodes;
                    molsToFocusIds = children.filters.onlyTerminal.map(
                        (n) => n.id as string
                    ) as string[];
                }
                break;
            }
        }

        if (molsToFocusIds.length === 0) {
            molsToFocusIds = visibleTerminalNodeModelsIds;
        }

        api.visualization.viewer?.renderAll();
        if (this.$store.state["updateZoom"]) {
            api.visualization.viewer?.zoomToModels(molsToFocusIds);
            // api.visualization.viewer.zoom(0.8);
        }
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
#mol-viewer {
    width: 100%;
    height: 100%;
    position: relative;
}

.cursor-grab {
    cursor: grab;
}

.cursor-pointer {
    cursor: pointer;
}

.cursor-grabbing {
    cursor: grabbing;
}
</style>
