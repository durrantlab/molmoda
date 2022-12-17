<template>
    <span :class="containerClass" @mousemove="onMouseMove">
        <div id="mol-viewer"></div>
    </span>
</template>

<script lang="ts">
import { Options } from "vue-class-component";

import * as api from "@/Api/";

import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";

import { unbondedAtomsStyle } from "@/FileSystem/LoadSaveMolModels/Types/DefaultStyles";
import {
    getTerminalNodes,
    getAllNodesFlattened,
} from "@/UI/Navigation/TreeView/TreeUtils";
import { Vue } from "vue-class-component";
import { Watch } from "vue-property-decorator";
import { ViewerNGL } from "./Viewers/ViewerNGL";
import { Viewer3DMol } from "./Viewers/Viewer3DMol";
import {
    loadViewerLibPromise,
    setLoadViewerLibPromise,
} from "./Viewers/ViewerParent";

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
     * @returns {IMolContainer[]} the molecules.
     */
    get treeview(): IMolContainer[] {
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
     * @param {IMolContainer[]} allMolecules  The new molecules.
     */
    @Watch("treeview", { immediate: false, deep: true })
    onTreeviewChanged(allMolecules: IMolContainer[]) {
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
                } else if (this.$store.state.molViewer === "ngl") {
                    api.visualization.viewer = new ViewerNGL();
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
    }

    /**
     * Update the styles and zoom of the molecules.
     *
     * @returns {Promise<any>}  A promise that resolves when the styles and
     *    zoom have been updated.
     */
    private _updateStylesAndZoom(): Promise<any> {
        api.messages.waitSpinner(true);

        return this._updateStyleChanges()
            .then((visibleTerminalNodeModelsIds) => {
                this._zoomPerFocus(visibleTerminalNodeModelsIds);
                api.messages.waitSpinner(false);
                return;
            })
            .catch((err) => {
                api.messages.waitSpinner(false);
                throw err;
            });
    }

    /**
     * Remove models no longer present in the vuex store molecules variables.
     *
     * @param {IMolContainer[]} terminalNodes  The terminal nodes of the treeview.
     */
    private _removeOldModels(terminalNodes: IMolContainer[]) {
        // Remove any molecules not presently in the terminal nodes.

        // Get the ids of the actual terminal nodes (should have deleted element
        // already removed)
        const idsOfTerminalNodes = terminalNodes.map(
            (node) => node.id
        ) as string[];

        api.visualization.viewer?.removeObjects(idsOfTerminalNodes);
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

        const visibleTerminalNodeModelsIds: string[] = [];
        const terminalNodes = getTerminalNodes(this.treeview);

        this._removeOldModels(terminalNodes);

        // Add all the models and put them in the cache.
        const addMolPromises =
            api.visualization.viewer?.addMolContainers(terminalNodes);

        // All models now loaded. Style them appropriately.
        return Promise.all(addMolPromises)
            .then((molContainers: IMolContainer[]) => {
                const surfacePromises: Promise<any>[] = [];

                for (const molContainer of molContainers) {
                    if (molContainer.visible) {
                        visibleTerminalNodeModelsIds.push(
                            molContainer.id as string
                        );
                    }

                    if (!molContainer.viewerDirty) {
                        // If the container isn't dirty, there's no need to apply a
                        // new style.
                        continue;
                    }

                    // You're about to update the style, so mark it as not dirty.
                    molContainer.viewerDirty = false;

                    // If mol is not visible, hide it.
                    if (!molContainer.visible) {
                        // hide it.
                        api.visualization.viewer?.hideObject(
                            molContainer.id as string
                        );

                        // Clear any surfaces associated with this molecule.
                        api.visualization.viewer?.clearSurfacesOfMol(
                            molContainer.id as string
                        );

                        continue;
                    }

                    // Make sure visible
                    api.visualization.viewer?.showObject(
                        molContainer.id as string
                    );

                    // There are styles to apply. Apply them.
                    if (molContainer.styles) {
                        // Styles to apply, so make sure it's visible.

                        // Clear current styles
                        api.visualization.viewer?.clearMoleculeStyles(
                            molContainer.id as string
                        );

                        // Clear any surfaces associated with this molecule.
                        api.visualization.viewer?.clearSurfacesOfMol(
                            molContainer.id as string
                        );

                        // Add new styles
                        let spheresUsed = false;
                        for (const style of molContainer.styles) {
                            if (!style["surface"]) {
                                // It's a style, not a surface.
                                const convertedStyle =
                                    api.visualization.viewer?.convertStyle(
                                        style,
                                        molContainer
                                    );
                                api.visualization.viewer?.setMolecularStyle(
                                    molContainer.id as string,
                                    api.visualization.viewer?.convertSelection(
                                        {}
                                    ),
                                    convertedStyle,
                                    true
                                );
                                if (style.sphere) {
                                    spheresUsed = true;
                                }
                                continue;
                            }

                            // It's a surface. Mark it for adding later.
                            const convertedStyle =
                                api.visualization.viewer?.convertStyle(
                                    style,
                                    molContainer
                                );
                            surfacePromises.push(
                                api.visualization.viewer?.addSurface(
                                    molContainer.id as string,
                                    convertedStyle
                                ) as Promise<any>
                            );
                        }

                        // Regardless of specified style, anything not bound to other molecule
                        // should be visible.
                        if (molContainer.styles.length > 0 && !spheresUsed) {
                            // If there's any style, no style is spheres, make sure unbonded
                            // atoms are visible.
                            const convertedStyle =
                                api.visualization.viewer?.convertStyle(
                                    unbondedAtomsStyle,
                                    molContainer
                                );
                            api.visualization.viewer?.setMolecularStyle(
                                molContainer.id as string,
                                api.visualization.viewer?.convertSelection({
                                    bonds: 0,
                                }),
                                convertedStyle,
                                true
                            );
                        }

                        continue;
                    }

                    // Visible, but no style specified. Is it a shape?
                    if (molContainer.shape) {
                        api.visualization.viewer?.updateShapeStyle(
                            molContainer.id as string,
                            molContainer.shape
                        );
                    }

                    // Visible, no styles, not a shape. This should never
                    // happen.
                    api.visualization.viewer?.setMolecularStyle(
                        molContainer.id as string,
                        api.visualization.viewer?.convertSelection({}),
                        api.visualization.viewer?.convertStyle(
                            { line: {} },
                            molContainer
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
        for (const molContainer of getAllNodesFlattened(this.treeview)) {
            if (molContainer.focused) {
                if (!molContainer.nodes) {
                    // Already terminal
                    molsToFocusIds = [molContainer.id as string];
                } else {
                    molsToFocusIds = getTerminalNodes(molContainer.nodes).map(
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
