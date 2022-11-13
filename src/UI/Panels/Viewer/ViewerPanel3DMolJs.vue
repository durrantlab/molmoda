<template>
  <span style="cursor: grab">
    <div id="mol-viewer"></div>
  </span>
</template>

<script lang="ts">
import { Options } from "vue-class-component";

import * as api from "@/Api/";

import { IStyle } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { dynamicImports } from "@/Core/DynamicImports";
import {
  LabelType,
  StyleType,
  SurfaceType,
  ViewerPanelParent,
  ViewerType,
} from "./ViewerPanelParent";
import { GLModel } from "./GLModelType";

/**
 * ViewerPanel3DMolJs component
 */
@Options({
  components: {},
})
export default class ViewerPanel3DMolJs extends ViewerPanelParent {
  surfaceType = 2;

  /**
   * Removes a model from the viewer.
   *
   * @param  {GLModel} mol  The model to remove.
   */
  removeModel(mol: GLModel) {
    // remove from viewer
    api.visualization.viewer.removeModel(mol);
  }

  /**
   * Removes a surface from the viewer.
   *
   * @param  {SurfaceType} surface  The surface to remove.
   */
  removeSurface(surface: SurfaceType) {
    api.visualization.viewer.removeSurface(surface);
  }

  /**
   * Hide a model.
   *
   * @param  {GLModel} model  The model to hide.
   */
  hideMolecule(model: GLModel) {
    model.hide();
  }

  /**
   * Show a model.
   *
   * @param  {GLModel} model  The model to show.
   */
  showMolecule(model: GLModel) {
    model.show();
  }

  /**
   * Clear the current molecular styles.
   *
   * @param  {GLModel} model  The model to clear the styles of.
   */
  clearMoleculeStyles(model: GLModel) {
    model.setStyle({}, {});
  }

  /**
   * Sets the style of a molecule. TODO: good to not use any type for selection.
   *
   * @param  {GLModel}    model        The model to set the style of.
   * @param  {any}        selection    The selection to apply the style to.
   * @param  {StyleType}  style        The style to apply.
   * @param  {boolean}    [add=false]  Whether to add the style to the existing
   *                                   styles. If false, replaces the existing
   *                                   style.
   */
  setMolecularStyle(
    model: GLModel,
    selection: any,
    style: StyleType,
    add = false
  ) {
    debugger;
    model.setStyle(selection, style, add);
  }

  /**
   * Adds a surface to the given model.
   *
   * @param  {GLModel}    model  The model to add the surface to.
   * @param  {StyleType}  style  The style of the surface.
   * @returns {Promise<SurfaceType>}  A promise that resolves when the surface.
   */
  addSurface(model: GLModel, style: StyleType): Promise<SurfaceType> {
    // NOTE: any in the promise is the surface object.
    return api.visualization.viewer.addSurface(
      // $3Dmol.SurfaceType.VDW,
      // $3Dmol.SurfaceType.MS,
      this.surfaceType,
      style.surface, // style
      { model: model as any } // selection
    );
  }

  /**
   * Adds a model to the viewer. Returns same model, but now it's been added
   * to viewer.
   *
   * @param  {GLModel} model  The model to add.
   * @returns {Promise<GLModel>}  The model that was added.
   */
  addGLModel(model: GLModel): Promise<GLModel> {
    api.visualization.viewer.addRawModel_JDD(model);
    return Promise.resolve(model);
  }

  /**
   * Render all the molecules and surfaces currently added to the viewer.
   */
  renderAll() {
    api.visualization.viewer.render();
  }

  /**
   * Zoom in on a set of models.
   *
   * @param  {GLModel[]} models  The models to zoom in on.
   */
  zoomToModels(models: GLModel[]) {
    api.visualization.viewer.zoomTo({ model: models }, 500, true);
  }

  /**
   * Zoom in on a specific point.
   *
   * @param  {number} x  The x coordinate.
   * @param  {number} y  The y coordinate.
   * @param  {number} z  The z coordinate.
   */
  zoomToPoint(x: number, y: number, z: number) {
    api.visualization.viewer.zoomTo({ x: x, y: y, z: z }, 500, true);
  }

  /**
   * Adds a label to the viewer
   *
   * @param  {string} lblTxt  The text of the label.
   * @param  {number} x       The x coordinate.
   * @param  {number} y       The y coordinate.
   * @param  {number} z       The z coordinate.
   * @returns {LabelType}  The label.
   */
  addLabel(lblTxt: string, x: number, y: number, z: number): LabelType {
    return api.visualization.viewer.addLabel(
      // TODO:
      lblTxt,
      // https://3dmol.csb.pitt.edu/doc/types.html#LabelSpec
      {
        position: { x: x, y: y, z: z },
        backgroundColor: "white",
        fontColor: "black",
        borderThickness: 1,
        borderColor: "black",
        backgroundOpacity: 0.9,
        // screenOffset: $3Dmol.Vector2(10, 10),
        inFront: true,
        alignment: "bottomCenter", // 'bottomLeft'
      }
    );
  }

  /**
   * Removes a label from the viewer.
   *
   * @param  {LabelType} label  The label to remove.
   */
  removeLabel(label: LabelType) {
    api.visualization.viewer.removeLabel(label);
  }

  /**
   * Make the atoms mouseover hoverable and clickable.
   *
   * @param {any} sel  The selection of the atoms to use.
   */
  private _makeAtomsHoverableAndClickable(sel: any) {
    // TODO: Below not generic
    api.visualization.viewer.setHoverable(
      sel,
      true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (atom: any, viewer: any, _event: any, _container: any) => {
        if (!atom.label) {
          let lbls: string[] = [];
          if (atom.chain) {
            lbls.push(atom.chain);
          }
          if (atom.resn) {
            lbls.push(atom.resn);
          }
          if (atom.resi) {
            lbls.push(atom.resi);
          }
          if (atom.atom) {
            lbls.push(atom.atom);
          }
          if (lbls.length > 0) {
            let lblTxt = lbls.join(":");

            atom.label = this.addLabel(lblTxt, atom.x, atom.y, atom.z);
            // atom.label = viewer.addLabel(
            //   // TODO:
            //   lblTxt,
            //   // https://3dmol.csb.pitt.edu/doc/types.html#LabelSpec
            //   {
            //     position: atom,
            //     backgroundColor: "white",
            //     fontColor: "black",
            //     borderThickness: 1,
            //     borderColor: "black",
            //     backgroundOpacity: 0.9,
            //     // screenOffset: $3Dmol.Vector2(10, 10),
            //     inFront: true,
            //     alignment: "bottomCenter", // 'bottomLeft'
            //   }
            // );
          }
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (atom: any, _viewer: any, _event: any, _container: any) => {
        if (atom.label) {
          setTimeout(() => {
            this.removeLabel(atom.label);
            delete atom.label; // TODO:
          }, 1000);
        }
      }
    );

    api.visualization.viewer.setClickable(
      // TODO:
      {},
      true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (atom: any, _viewer: any, _event: any, _container: any) => {
        this.zoomToPoint(atom.x, atom.y, atom.z);
        this.$store.commit("clearFocusedMolecule", false);
      }
    );
  }

  /**
   * Load 3dmol.js dynamically, set the viewer object, etc.
   *
   * @returns {Promise<any>}  A promise that resolves the viewer object when
   *     3dmol.js is loaded.
   */
  loadAndSetupViewerLibrary(): Promise<ViewerType> {
    return dynamicImports.mol3d.module
      .then(($3Dmol: any) => {
        this.surfaceType = $3Dmol.SurfaceType.MS;

        let viewer = $3Dmol.createViewer("mol-viewer", {
          defaultcolors: $3Dmol.rasmolElementColors,
        });

        viewer.setBackgroundColor(0xffffff);

        console.warn('viewer.setViewStyle({style:"outline"})');

        return viewer;
      })
      .catch((err: any) => {
        console.log(err);
      });
  }

  /**
   * Converts the 3DMoljs style stored in the molecules tree to a style format
   * compatible with this viewer.
   *
   * @param {IStyle} style  The style to convert.
   * @returns {IStyle}  The converted style.
   */
  convertStyle(style: IStyle): IStyle {
    // Already in 3Dmoljs format, so no conversion needed.
    return style;
  }

  /**
   * Converts a 3DMoljs selection to the selection format compatible with this
   * viewer.
   *
   * @param {any} sel  The selection to convert.
   * @returns {any}  The converted selection.
   */
  convertSelection(sel: any): any {
    // Already in 3Dmoljs format, so no conversion needed.
    return sel;
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
</style>
