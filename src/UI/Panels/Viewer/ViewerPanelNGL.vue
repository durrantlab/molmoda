<template>
  <span style="cursor: grab">
    <div id="mol-viewer"></div>
  </span>
</template>

<script lang="ts">
import { Options } from "vue-class-component";

import * as api from "@/Api/";

import {
  IColorStyle,
  IMolContainer,
  IStyle,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { dynamicImports } from "@/Core/DynamicImports";
import {
  LabelType,
  ModelType,
  StyleType,
  SurfaceType,
  ViewerPanelParent,
  ViewerType,
} from "./ViewerPanelParent";
import { GLModel } from "./GLModelType";
import { convertMolContainers } from "@/FileSystem/LoadSaveMolModels/ConvertMolModels/ConvertMolContainer";
import { colorNameToHex } from "../Options/Styles/ColorSelect/ColorConverter";
import { defaultElementColor, elementColors } from "./ElementColors";

let NGL: any;

/**
 * ViewerPanelNGL component
 */
@Options({
  components: {},
})
export default class ViewerPanelNGL extends ViewerPanelParent {
  surfaceType = 2;

  /**
   * Removes a model from the viewer.
   *
   * @param  {ModelType} mol  The model to remove.
   */
  removeModel(mol: ModelType) {
    // remove from viewer
    mol.dispose();
  }

  /**
   * Removes a surface from the viewer.
   *
   * @param  {SurfaceType} surface  The surface to remove.
   */
  removeSurface(surface: SurfaceType) {
    // ngl throws an error. Very annoying. Couldn't debug, so just catch.
    try {
      surface.dispose();
    } catch (e) {
      return;
    }
    // Below doesn't throw error, but I don't think surface is being removed
    // from memory...
    // surface.setVisibility(false);
  }

  /**
   * Hide a model.
   *
   * @param  {ModelType} model  The model to hide.
   */
  hideMolecule(model: ModelType) {
    model.setVisibility(false);
  }

  /**
   * Show a model.
   *
   * @param  {ModelType} model  The model to show.
   */
  showMolecule(model: ModelType) {
    model.setVisibility(true);
  }

  /**
   * Clear the current molecular styles.
   *
   * @param  {ModelType} model  The model to clear the styles of.
   */
  clearMoleculeStyles(model: ModelType) {
    model.removeAllRepresentations();
  }

  /**
   * Converts the 3DMoljs style stored in the molecules tree to a style format
   * compatible with this viewer.
   *
   * @param {IStyle}        style         The style to convert.
   * @param {IMolContainer} molContainer  The molecular container, which may
   *                                      contain additional/more accessible
   *                                      information about the molecule than is
   *                                      available in the model itself.
   * @returns {StyleType}  The converted style.
   */
  convertStyle(style: IStyle, molContainer: IMolContainer): StyleType {
    const styleAsDict = style as { [key: string]: IColorStyle };

    let newStyle: { [key: string]: any } = {
      multipleBond: true,
    };

    // Iterate through properties of the style
    for (const component in style) {
      // component is like sphere, stick, line, etc.
      const colorStyle = styleAsDict[component];

      const color = colorStyle.color;
      const colorscheme = colorStyle.colorscheme;
      const radius = colorStyle.radius;

      switch (color) {
        case undefined:
          break;
        case "spectrum":
          newStyle[component] = { colorScheme: "atomindex" };
          break;
        default:
          newStyle[component] = { color: color };
          break;
      }

      let chainId = "A";

      // Create a list of 10 pastel colors, hex
      const chainColors = [
        "#FFB3BA",
        "#FFDFBA",
        "#FFFFBA",
        "#BAFFC9",
        "#BAE1FF",
        "#D0BAFF",
        "#FFBAF2",
        "#FFB3BA",
        "#FFDFBA",
        "#FFFFBA",
      ];

      switch (colorscheme) {
        case undefined:
          break;
        case "default":
          newStyle[component] = { colorScheme: "element" };
          break;
        case "ssJmol":
          newStyle[component] = { colorScheme: "sstruc" };
          break;
        case "chain":
          if (molContainer.model) {
            chainId = (molContainer.model as GLModel).selectedAtoms({})[0]
              .chain;
          }
          // Convert chainId to a number between 0 and 9, inclusive.
          newStyle[component] = {
            color: chainColors[chainId.charCodeAt(0) % 10],
          };
          break;
        default:
          // debugger;
          if (colorscheme.endsWith("Carbon")) {
            const schemeId = NGL.ColormakerRegistry.addScheme(function (
              params: any
            ) {
              // See https://nglviewer.org/ngl/api/manual/usage/coloring.html

              const carbonColor = parseInt(
                "0x" + colorNameToHex(colorscheme.slice(0, -6)).slice(1)
              );

              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              (this as any).atomColor = (atom: any): any => {
                if (atom.element === "C") {
                  return carbonColor;
                } else {
                  return elementColors[atom.element] !== undefined
                    ? elementColors[atom.element]
                    : defaultElementColor;
                }
              };
            });

            newStyle[component] = { colorScheme: schemeId };
          }
      }

      if (color === undefined && colorscheme === undefined) {
        // Default is element
        newStyle[component] = { colorScheme: "element" };
      }

      if (radius !== undefined) {
        newStyle[component] = { aspectRatio: radius };
      }
    }

    return newStyle;
  }

  /**
   * Converts a 3DMoljs selection to the selection format compatible with this
   * viewer.
   *
   * @param {any} sel  The selection to convert.
   * @returns {string}  The converted selection string.
   */
  convertSelection(sel: any): string {
    // Not too many selections are used. Just not bonded and all.
    if (sel.bonds !== undefined && sel.bonds === 0) {
      return "not bonded";
    }

    return "all";
  }

  /**
   * Sets the style of a molecule. TODO: good to not use any type for selection.
   *
   * @param  {ModelType}  model        The model to set the style of.
   * @param  {string}     selection    The selection to apply the style to.
   * @param  {StyleType}  style        The style to apply.
   * @param  {boolean}    [add=false]  Whether to add the style to the existing
   *                                   styles. If false, replaces the existing
   *                                   style.
   */
  setMolecularStyle(
    model: ModelType,
    selection: string,
    style: StyleType,
    add = false
  ) {
    if (!add) {
      // Clear existing style
      this.clearMoleculeStyles(model);
    }

    // Iterate through properties of the style
    for (const component in style) {
      // component is like sphere, stick, line, etc.
      const styleAsDict = style as { [key: string]: any };
      const componentStyle = styleAsDict[component];

      switch (component) {
        case "sphere":
          if (componentStyle.aspectRatio !== undefined) {
            // Used for non-bonded atoms.
            const params = {
              sele: selection,
              ...componentStyle,
            };
            params.aspectRatio = 5 * params.aspectRatio;
            model.addRepresentation("ball+stick", params);
          } else {
            model.addRepresentation("spacefill", {
              sele: selection,
              ...componentStyle,
            });
          }
          break;
        case "stick":
          model.addRepresentation("ball+stick", {
            sele: selection,
            ...componentStyle,
            aspectRatio: 1,
          });
          break;
        case "line":
          model.addRepresentation("line", {
            sele: selection,
            ...componentStyle,
          });
          break;
        case "cartoon":
          model.addRepresentation("cartoon", {
            sele: selection,
            ...componentStyle,
          });
          break;
      }
    }
  }

  /**
   * Adds a surface to the given model.
   *
   * @param  {ModelType}  model  The model to add the surface to.
   * @param  {StyleType}  style  The style of the surface.
   * @returns {Promise<SurfaceType>}  A promise that resolves when the
   *     surface.
   */
  addSurface(model: ModelType, style: StyleType): Promise<SurfaceType> {
    const surf = model.addRepresentation("surface", {
      ...style.surface,
    });

    // sele: "not hetero",
    // multipleBond: true,
    // color: "#00FF00",
    // , opacity: 0.6

    return Promise.resolve(surf);
  }

  /**
   * Adds a model to the viewer. Returns same model, but now it's been added
   * to viewer.
   *
   * @param  {GLModel} model  The model to add.
   * @returns {Promise<ModelType>}  The model that was added.
   */
  addGLModel(model: GLModel): Promise<ModelType> {
    // TODO: If ligand, convert to SDF (preserve bond orders)

    // Convert the model to PDB
    return convertMolContainers(
      [
        {
          model: model,
        } as IMolContainer,
      ],
      "pdb",
      true
    )
      .then((pdbTxt: string[]) => {
        let stringBlob = new Blob([pdbTxt[0]], { type: "text/plain" });

        // Return the model
        return api.visualization.viewer.loadFile(stringBlob, {
          ext: "pdb",
          // defaultRepresentation: true, // TODO: Remove after debugging.
        });
      })
      .catch((err) => {
        console.error(err);
      });
  }

  /**
   * Render all the molecules and surfaces currently added to the viewer.
   */
  renderAll() {
    // I don't believe ngl requires a render.
    return;
  }

  /**
   * Zoom in on a set of models.
   *
   * @param  {ModelType[]} models              The models to zoom in on.
   */
  zoomToModels(models: ModelType[]) {
    api.visualization.viewer.animationControls.clear();

    // Get a box that encompasses all the models.
    const encompassingBox = models[0].getBox();
    for (let i = 1; i < models.length; i++) {
      encompassingBox.union(models[i].getBox());
    }

    // Make the box a bit bigger.,
    encompassingBox.min.x -= 0.5;
    encompassingBox.min.y -= 0.5;
    encompassingBox.min.z -= 0.5;
    encompassingBox.max.x += 0.5;
    encompassingBox.max.y += 0.5;
    encompassingBox.max.z += 0.5;

    api.visualization.viewer.animationControls.zoomMove(
      encompassingBox.getCenter(),
      api.visualization.viewer.getZoomForBox(encompassingBox),
      500
    );
  }

  /**
   * Zoom in on a specific point.
   *
   * @param  {number} x  The x coordinate.
   * @param  {number} y  The y coordinate.
   * @param  {number} z  The z coordinate.
   */
  zoomToPoint(x: number, y: number, z: number) {
    api.visualization.viewer.animationControls.clear();

    const box = api.visualization.viewer.getBox();
    box.min.x = x - 1;
    box.min.y = y - 1;
    box.min.z = z - 1;
    box.max.x = x + 1;
    box.max.y = y + 1;
    box.max.z = z + 1;

    api.visualization.viewer.animationControls.zoomMove(
      box.getCenter(),
      api.visualization.viewer.getZoomForBox(box),
      500
    );
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
    return dynamicImports.ngl.module
      .then((ngl: any) => {
        NGL = ngl;

        const stage = new ngl.Stage("mol-viewer", { backgroundColor: "white" });

        // Handle window resizing
        window.addEventListener(
          "resize",
          () => {
            stage.handleResize();
          },
          false
        );

        // this.surfaceType = NGL.SurfaceType.MS;

        return stage;
      })
      .catch((err: any) => {
        console.log(err);
      });
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
