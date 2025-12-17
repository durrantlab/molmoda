<template>
  <span :class="containerClass" @mousemove="onMouseMove">
    <div id="mol-viewer"></div>
  </span>
</template>

<script lang="ts">
import { Options } from "vue-class-component";

import * as api from "@/Api/";

import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

import { unbondedAtomsStyle } from "@/Core/Styling/SelAndStyleDefinitions";
import { Vue } from "vue-class-component";
import { Watch } from "vue-property-decorator";
// import { ViewerNGL } from "./Viewers/ViewerNGL";
import { Viewer3DMol } from "./Viewers/Viewer3DMol";
import {
  loadViewerLibPromise,
  setLoadViewerLibPromise,
} from "./Viewers/ViewerParent";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import {
  SelectedType,
  TreeNodeType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { ISelAndStyle } from "@/Core/Styling/SelAndStyleInterfaces";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import isEqual from "lodash.isequal";

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
   * Load the viewer library.
   *
   * @returns {Promise<void>}  A promise that resolves when the viewer is
   *     loaded.
   */
  async loadViewer(): Promise<void> {
    // Putting it in setTimeout so some components of UI will react
    // immediately. Below can be time consuming in some cases.
    if (loadViewerLibPromise === undefined) {
      // Note: These need to be promises (not async/await) because the
      // promise must be passed to setLoadViewerLibPromise().
      if (api.visualization.viewerObj !== undefined) {
        // Molecular library already loaded.
        setLoadViewerLibPromise(Promise.resolve(api.visualization.viewerObj));
      } else {
        // Need to load the molecular library.
        if (this.$store.state.molViewer === "3dmol") {
          api.visualization.viewerObj = new Viewer3DMol();
          // } else if (this.$store.state.molViewer === "ngl") {
          // api.visualization.viewer = new ViewerNGL();
        } else {
          throw new Error("Unknown viewer");
        }

        const promise = api.visualization.viewerObj
          ?.loadAndSetupViewerLibrary("mol-viewer", (classes: string) => {
            this.containerClass = classes;
          })
          .then((viewer: any) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            window["viewer"] = viewer;

            api.visualization.viewerObj = viewer;

            viewer.setBackgroundClickable(() => {
              api.plugins.runPlugin("clearselection");
            });

            this.$emit("onViewerLoaded");
            return viewer;
          });

        setLoadViewerLibPromise(promise);
      }
    }

    (await loadViewerLibPromise) as Promise<any>;
  }

  /**
   * Checks if the treeview has changed. This is the glue that connects the
   * tree view navigator to the viewer.
   *
   * Note: To help with code searching, this might be another way to describe
   * this function: @Watch("molecules")
   *
   * @param {TreeNodeList} allMolecules  The new molecules.
   */
  @Watch("treeview", { immediate: false, deep: true })
  async onTreeviewChanged(allMolecules: TreeNodeList) {
    setTimeout(async () => {
      await this.loadViewer();

      // You now have the viewer. Set the view-change callback.
      // TODO: Is this registered multiple times?
      api.visualization.viewerObj?.registerViewChangeCallback(
        (view: number[]) => {
          this.$store.commit("setVar", {
            name: "viewerVantagePoint",
            val: view,
          });
        }
      );

      // if (allMolecules.length === 0) {
      //     // No molecules present
      //     api.visualization.viewerObj?.clearCache();
      //     return;
      // }

      // Update styles and zoom
      const updatedStyles = this._updateStyleChanges();

      if (allMolecules.length === 0) {
        // No molecules present. Perhaps not necessary, but let's clear
        // the cache just in case.
        api.visualization.viewerObj?.clearCache();
      }

      return updatedStyles;
    }, 0);
  }

  /**
   * Update the styles and zoom of the molecules.
   *
   * @returns {Promise<any>}  A promise that resolves when the styles and
   *    zoom have been updated.
   */
  // private async _updateStyles(): Promise<any> {
  //     const spinnerId = api.messages.startWaitSpinner();
  //     try {
  //         // const visibleTerminalNodeModelsIds =

  //         await this._updateStyleChanges();
  //         // this._zoomPerFocus(visibleTerminalNodeModelsIds);
  //         // api.visualization.viewer?.zoomOnFocused(visibleTerminalNodeModelsIds);
  //         api.messages.stopWaitSpinner(spinnerId);
  //     } catch (err) {
  //         api.messages.stopWaitSpinner(spinnerId);
  //         throw err;
  //     }
  // }

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

    api.visualization.viewerObj?.removeObjects(idsOfTerminalNodes);
  }

  /**
   * Change the style if the node is selected.
   *
   * @param {TreeNode} treeNode  The tree node to change the style of.
   * @param {any}      style     The style to change.
   * @returns {any}  The changed style.
   */
  private _changeStyleIfSelected(treeNode: TreeNode, style: any): any {
    // Metals, ions, solvent, other are solid yellow. Others, carbon only
    // yellow.
    let justColorCarbons =
      [
        TreeNodeType.Metal,
        TreeNodeType.Ions,
        TreeNodeType.Solvent,
        TreeNodeType.Other,
        undefined,
      ].indexOf(treeNode.type) === -1;

    // If it's surface, let's to make it always solid yellow (even if
    // protein or liand).
    if (style["surface"]) {
      justColorCarbons = false;
    }

    // If this treenode is selected, make sure it's highlighted.
    if (
      treeNode.selected === SelectedType.False ||
      treeNode.selected === undefined
    ) {
      return style;
    }

    if (justColorCarbons) {
      // Just color the carbons yellow
      for (let key in style) {
        if (key === "selection" || key === "moleculeId" || key === "hydrogens") {
          // Don't change the selection or hydrogens.
          continue;
        }
        if (style[key]["color"]) {
          delete style[key]["color"];
        }

        style[key]["colorscheme"] = "yellowCarbon";
      }
    } else {
      // Color everything yellow.
      for (let key in style) {
        if (key === "selection" || key === "moleculeId" || key === "hydrogens") {
          // Don't change the selection or hydrogens.
          continue;
        }

        if (style[key]["colorscheme"]) {
          delete style[key]["colorscheme"];
        }

        style[key]["color"] = "yellow";
      }
    }

    // stylesToUse.push({ sphere: { radius: 1.75, color: "yellow", opacity: 0.5 } });

    return style;
  }
  private previousSurfaceStylesCache: { [key: string]: ISelAndStyle } = {};
  /**
   * Set the surface style.
   *
   * @param {TreeNode}    treeNode   The tree node to set the style
   *            of.
   * @param {ISelAndStyle[]}    surfaceStyles The surface styles.
   * @param {Promise<any>[]} surfacePromises  The promises for the surfaces.
   * @returns {Promise<void>}  A promise that resolves when the surface style
   *  has been set.
   */
  private async _setSurfaceStyle(
    treeNode: TreeNode,
    surfaceStyles: ISelAndStyle[],
    surfacePromises: Promise<any>[]
  ): Promise<void> {
    if (surfaceStyles.length === 0) {
      return;
    }
    // Clear current (nonsurface) styles. Because if there's a surface, why show
    // anything beneath it? NOTE: Actually, there are circumstances where you'd
    // want to maintain what's beneath the surface.
    // api.visualization.viewerObj?.clearMoleculeStyles(treeNode.id as string);
    const previousSurfaceStyle =
      this.previousSurfaceStylesCache[treeNode.id as string];
    // Clear any surfaces associated with this molecule.
    // api.visualization.viewerObj?.clearSurfacesOfMol(treeNode.id as string);
    // Add new surface styles
    for (let style of surfaceStyles) {
      // Deep copy style
      style = JSON.parse(JSON.stringify(style));
      style = this._changeStyleIfSelected(treeNode, style);
      // console.log("Previous surface style:", previousSurfaceStyle);
      // console.log("Current surface style:", style);
      // It's a surface. Mark it for adding later.
      const convertedStyle = api.visualization.viewerObj?.convertStyle(
        style,
        treeNode
      );
      // Check if we can just update the style on the existing surface instead of recreating it.
      // We can update if the previous style exists and the selection hasn't changed.
      const selectionChanged = !isEqual(previousSurfaceStyle?.selection, style.selection);
      if (previousSurfaceStyle !== undefined && !selectionChanged && api.visualization.viewerObj?.updateSurfaceStyle) {
        // Existing surface with same selection. Just update the style.
        api.visualization.viewerObj.updateSurfaceStyle(treeNode.id as string, convertedStyle);
      } else {
        // No previous surface or selection changed. Need to recreate.
        // Delete existing surface.
        api.visualization.viewerObj?.clearSurfacesOfMol(treeNode.id as string);
        // Add new surface.
        surfacePromises.push(
          api.visualization.viewerObj?.addSurface(
            treeNode.id as string,
            convertedStyle
          ) as Promise<any>
        );
      }
      // NOTE: Should only be one element in surfaceStyles. So cache can
      // just be single style.
      this.previousSurfaceStylesCache[treeNode.id as string] = JSON.parse(
        JSON.stringify(style)
      );
    }
  }
  /**
   * Set the non-surface style.
   *
   * @param {ISelAndStyle[]} nonSurfaceStyles  The non-surface styles.
   * @param {TreeNode} treeNode          The tree node to set the style of.
   */
  private _setNonSurfaceStyle(nonSurfaceStyles: ISelAndStyle[], treeNode: TreeNode) {
    if (nonSurfaceStyles.length === 0) {
      return;
    }

    // Always clear any surfaces associated with this molecule (because no
    // longer valid).
    api.visualization.viewerObj?.clearSurfacesOfMol(treeNode.id as string);

    // Remove surfaces from the cache, too.
    delete this.previousSurfaceStylesCache[treeNode.id as string];

    // Clear current styles, because about to reset them.
    api.visualization.viewerObj?.clearMoleculeStyles(treeNode.id as string);

    // Add new nonsurface styles
    // let spheresUsed = false;
    for (let style of nonSurfaceStyles) {
      // Deep copy style
      style = JSON.parse(JSON.stringify(style));

      style = this._changeStyleIfSelected(treeNode, style) as ISelAndStyle;

      if (style.selection === undefined) {
        // No selection specified, so set to all atoms.
        style.selection = {};
      }

      let convertedSelAndStyle = api.visualization.viewerObj?.convertSelectionAndStyle(
        style,
        treeNode
      );

      api.visualization.viewerObj?.setMolecularStyle(
        treeNode.id as string,
        convertedSelAndStyle?.selection,
        convertedSelAndStyle?.style,
        true
      );

      //   if (style.sphere) {
      //     spheresUsed = true;
      //   }

      // Regardless of specified style, anything not bound to other molecule
      // should be visible (unless sphere, in which case already visible, or
      // cartoon, in which case some atoms should not be visible).
      if (!convertedSelAndStyle?.style.sphere && !convertedSelAndStyle?.style.cartoon) {
        // Get the color or colorscheme entry.
        let colorOrColorScheme = "";
        let colorValue = "";


        for (let key in convertedSelAndStyle?.style) {
          // if (treeNode.type === TreeNodeType.Solvent) {
          //   debugger;
          // }
          if (key === "selection" || key === "hydrogens") {
            // Don't change the selection.
            continue;
          }
          const stylePart = (convertedSelAndStyle?.style as { [key: string]: any })[key];
          if (stylePart["color"]) {
            colorOrColorScheme = "color";
            colorValue = stylePart["color"];
            break;
          } else if (stylePart["colorscheme"]) {
            colorOrColorScheme = "colorscheme";
            colorValue = stylePart["colorscheme"];
            break;
          }
        }

        // console.log(convertedSelAndStyle?.style);
        let styleUnbonded = JSON.parse(JSON.stringify(unbondedAtomsStyle));

        if (colorOrColorScheme !== "") {
          // Add color to unbonded style
          for (let key in styleUnbonded) {
            if (key === "selection") {
              // Don't change the selection.
              continue;
            }
            const stylePart = (styleUnbonded as { [key: string]: any })[key];
            stylePart[colorOrColorScheme] = colorValue;
          }
        }

        // If there's any style, no style is spheres, make sure unbonded
        // atoms are visible.
        const selectedStyle = this._changeStyleIfSelected(treeNode, styleUnbonded);

        convertedSelAndStyle = api.visualization.viewerObj?.convertSelectionAndStyle(
          selectedStyle,
          treeNode
        );

        api.visualization.viewerObj?.setMolecularStyle(
          treeNode.id as string,
          convertedSelAndStyle?.selection,
          convertedSelAndStyle?.style,
          true
        );
      }
    }
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
    if (treeNode.styles === undefined) {
      return false;
    }
    // Styles to apply, so make sure it's visible.
    let surfaceStyles: ISelAndStyle[] = []; // Should only be one, but keep list for consistency.
    let nonSurfaceStyles: ISelAndStyle[] = [];
    // Separate surface style from other styles
    for (let style of treeNode.styles) {
      if (style.surface) {
        surfaceStyles.push(style);
      } else {
        nonSurfaceStyles.push(style);
      }
    }
    this._setNonSurfaceStyle(nonSurfaceStyles, treeNode);
    this._setSurfaceStyle(treeNode, surfaceStyles, surfacePromises);
    return true;
  }
  /**
   * Updates any style changes.
   *
   * @returns {Promise<string[]>}  A promise that resolves the ids of the
   *     molecules that are visible.
   */
  private async _updateStyleChanges(): Promise<string[]> {
    const spinnerId = api.messages.startWaitSpinner();

    // Remove any only molecules no longer in vuex store.
    const terminalNodes = this.treeview.filters.onlyTerminal;
    this._removeOldModels(terminalNodes);

    // Add all the models and put them in the cache. This also hides the
    // regions if visible == false on the node.
    const viewer = await api.visualization.viewer;
    const addMolPromises = viewer.addTreeNodeList(terminalNodes) || [];

    const treeNodes: TreeNode[] = await Promise.all(addMolPromises);

    const surfacePromises: Promise<any>[] = [];

    // Keep track of visible molecules so you can zoom on them
    // later.
    let visibleTerminalNodeModelsIds = treeNodes
      .filter((treeNode: TreeNode) => treeNode.visible)
      .map((treeNode: TreeNode) => treeNode.id as string);

    // Get only the dirty nodes. If the node isn't dirty, there's no
    // need to apply a new style.
    const dirtyNodes = treeNodes.filter(
      (treeNode: TreeNode) => treeNode.viewerDirty
    );
    // You're about to update the style, so mark it for not dirty.
    dirtyNodes.forEach((treeNode: TreeNode) => {
      treeNode.viewerDirty = false;
    });

    const visibleDirtyNodes = dirtyNodes.filter(
      (treeNode: TreeNode) => treeNode.visible
    );
    const invisibleDirtyNodes = dirtyNodes.filter(
      (treeNode: TreeNode) => !treeNode.visible
    );

    // Make sure invisible ones are really invisible.
    for (let treeNode of invisibleDirtyNodes) {
      // Since not supposed to be visible, we won't keep
      // it in the list. But make sure it's hidden here.

      // hide it.
      // console.log("Hiding:" + treeNode.id);
      viewer.hideObject(treeNode.id as string);

      // Clear any surfaces associated with this molecule.
      viewer.clearSurfacesOfMol(treeNode.id as string);
    }

    for (const treeNode of visibleDirtyNodes) {
      // There are styles to apply. Apply them.
      if (this._clearAndSetStyle(treeNode, surfacePromises)) {
        // Make sure actually visible. This also makes
        // clickable, etc.
        viewer.showObject(treeNode.id as string);
        continue;
      }

      // Make sure actually visible
      viewer.showObject(treeNode.id as string);

      // Visible, but no style specified. Is it a region?
      if (treeNode.region) {
        viewer.updateRegionStyle(treeNode);
        continue;
      }

      // NOTE: If you get here, an error occurred. Visible, no styles, not
      // a region. This should never happen.
      viewer.setMolecularStyle(
        treeNode.id as string,
        viewer.convertSelection({}),
        viewer.convertStyle({ selection: {}, line: {} }, treeNode)
      );
      console.warn("error?");
    }

    await Promise.all(surfacePromises);

    api.messages.stopWaitSpinner(spinnerId);

    return visibleTerminalNodeModelsIds;
  }

  // /**
  //  * Zoom in on the visible molecules.
  //  *
  //  * @param {string[]} visibleTerminalNodeModelsIds  The visible models. If no
  //  *                                                 tree nodes are labeled as
  //  *                                                 focused, the function
  //  *                                                 will just use all visible
  //  *                                                 terminal nodes.
  //  */
  // private _zoomPerFocus(visibleTerminalNodeModelsIds: string[]) {
  //     let molsToFocusIds: string[] = [];
  //     const flatNodes = this.treeview.flattened;
  //     for (let idx = 0; idx < flatNodes.length; idx++) {
  //         const treeNode = flatNodes.get(idx);
  //         if (treeNode.focused) {
  //             if (!treeNode.nodes) {
  //                 // Already terminal
  //                 molsToFocusIds = [treeNode.id as string];
  //             } else {
  //                 const children = treeNode.nodes;
  //                 molsToFocusIds = children.filters.onlyTerminal.map(
  //                     (n) => n.id as string
  //                 ) as string[];
  //             }
  //             break;
  //         }
  //     }

  //     if (molsToFocusIds.length === 0) {
  //         molsToFocusIds = visibleTerminalNodeModelsIds;
  //     }

  //     api.visualization.viewer?.renderAll();
  //     if (this.$store.state["updateZoom"]) {
  //         api.visualization.viewer?.zoomToModels(molsToFocusIds);
  //         // api.visualization.viewer.zoom(0.8);
  //     }
  // }
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
