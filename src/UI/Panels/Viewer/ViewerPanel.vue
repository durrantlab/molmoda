<template>
  <div id="mol-viewer"></div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";
import { Watch } from "vue-property-decorator";

import * as api from "@/Api/";
import {
  getAllNodesFlattened,
  getTerminalNodes,
} from "@/UI/Navigation/TreeView/TreeUtils";

// @ts-ignore
import * as tmp from "./3Dmol-nojquery.JDD";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { unbondedAtomsStyle } from "@/FileSystem/LoadSaveMolModels/Lookups/DefaultStyles";
const $3Dmol = tmp as any;

@Options({})
export default class ViewerPanel extends Vue {
  molCache: { [id: string]: any } = {};

  // Need to keep track of surfaces, associating them with molecule ids.
  surfaces: { [id: string]: number[] } = {};

  get treeview(): any {
    return this.$store.state["molecules"];
  }

  @Watch("treeview", { immediate: false, deep: true })
  onTreeviewChanged(allMolecules: IMolContainer[], oldAllMolecules: IMolContainer[]) {
    if (allMolecules.length === 0) {
      return;
    }
    this._updateStylesAndZoom(allMolecules);
  }

  private _updateStylesAndZoom(allMolecules: IMolContainer[] | undefined = undefined) {
    if (allMolecules === undefined) {
      allMolecules = this.treeview as IMolContainer[];
    }
    let visibleTerminalNodeModels = this._checkStyleChanges(allMolecules);
    this._zoomPerFocus(allMolecules, visibleTerminalNodeModels);
  }

  private _clearSurface(mol: IMolContainer) {
    if (mol.id && this.surfaces[mol.id]) {
      for (const surface of this.surfaces[mol.id]) {
        api.visualization.viewer.removeSurface(surface);
        delete this.surfaces[mol.id];
      }
    }
  }

  private _checkStyleChanges(allMolecules: IMolContainer[]): any[] {
    let visibleTerminalNodeModels: any[] = [];
    let terminalNodes = getTerminalNodes(allMolecules);

    for (const mol of terminalNodes) {
      let id = mol.id as string;

      if (mol.visible) {
        visibleTerminalNodeModels.push(mol.model);
      }

      // If it's not in the cache, the molecule has likely not been loaded.
      // Always load it.
      if (!this.molCache[id]) {
        let visMol = api.visualization.viewer.addRawModel_JDD(mol.model);
        this.molCache[id] = visMol;
        this._makeAtomsHoverableAndClickable({model: visMol});
      }

      // If a molecule is marked "dirty", a new style needs to be applied.
      if (mol.viewerDirty) {
        if (!mol.visible) {
          // hide it.
          (mol.model as any).hide();

          // Clear any surfaces associated with this molecule.
          this._clearSurface(mol);
        } else if (mol.stylesSels) {
          // There are styles to apply, so make sure it's visible.
          (mol.model as any).show();

          // Clear current styles
          (mol.model as any).setStyle({}, {});

          // Clear any surfaces associated with this molecule.
          this._clearSurface(mol);

          // Add new styles
          let spheresUsed = false;
          for (const styleSel of mol.stylesSels) {
            if (!styleSel.style["surface"]) {
              // It's a style, not a surface.
              // console.log("style right before adding to 3dmoljs:", styleSel.style);
              (mol.model as any).setStyle(styleSel.selection, styleSel.style, true);
              if (styleSel.style.sphere) {spheresUsed = true;}
            } else {
              // It's a surface
              api.visualization.viewer
                .addSurface(
                  // $3Dmol.SurfaceType.VDW,
                  $3Dmol.SurfaceType.MS,
                  styleSel.style.surface, // style
                  { model: (mol.model as any) } // selection
                )
                .then((surface: any) => {
                  if (mol.id) {
                    this.surfaces[mol.id] = this.surfaces[mol.id] || [];
                    this.surfaces[mol.id].push(surface);
                  }
                });
            }
          }

          // Regardless of specified style, anything not bound to other things
          // should be visible.
          if (mol.stylesSels.length > 0 && !spheresUsed) {
            // If there's any style, no style is spheres, make sure unbonded
            // atoms are shown.
            (mol.model as any).setStyle(
              unbondedAtomsStyle.selection,
              unbondedAtomsStyle.style,
              true
            );
          }
        } else {
          // Visible, but no style specified. This should never happen.
          (mol.model as any).setStyle({}, { line: {} });
          console.warn("error?");
        }

        mol.viewerDirty = false;
      }
    }

    return visibleTerminalNodeModels;
  }

  private _zoomPerFocus(allMolecules: IMolContainer[], visibleTerminalNodeModels: any[]) {
    let molsToFocus: IMolContainer[] = [];
    for (const mol of getAllNodesFlattened(allMolecules)) {
      if (mol.focused) {
        if (!mol.nodes) {
          // Already terminal
          molsToFocus = [mol.model as any];
        } else {
          molsToFocus = getTerminalNodes(mol.nodes).map((n) => n.model) as any[];
        }
        break;
      }
    }

    if (molsToFocus.length === 0) {
      molsToFocus = visibleTerminalNodeModels;
    }

    api.visualization.viewer.render();
    if (this.$store.state["updateZoom"]) {
      api.visualization.viewer.zoomTo({ model: molsToFocus }, 500, true);
    }
    // api.visualization.viewer.zoom(0.8);
  }


  private _makeAtomsHoverableAndClickable(sel: any) {
    api.visualization.viewer.setHoverable(
      sel,
      true,
      function (atom: any, viewer: any, event: any, container: any) {
        if (!atom.label) {
          let lbls: string[] = [];
          if (atom.chain) { lbls.push(atom.chain); }
          if (atom.resn) { lbls.push(atom.resn); }
          if (atom.resi) { lbls.push(atom.resi); }
          if (atom.atom) { lbls.push(atom.atom); }
          if (lbls.length > 0) {
            let lblTxt = lbls.join(":");

            atom.label = viewer.addLabel(
              lblTxt,
              // https://3dmol.csb.pitt.edu/doc/types.html#LabelSpec
              {
                position: atom,
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
        }
      },
      function (atom: any, viewer: any, event: any, container: any) {
        if (atom.label) {
          setTimeout(() => {
            viewer.removeLabel(atom.label);
            delete atom.label;
          }, 1000);
        }
      }
    );

    api.visualization.viewer.setClickable(
      {}, true,
      (atom: any, viewer: any, event: any, container: any) => {
        api.visualization.viewer.zoomTo({ x: atom.x, y: atom.y, z: atom.z }, 500, true);
        this.$store.commit("clearFocusedMolecule", false);
      }
    );
  }

  // Mounted
  mounted() {
    let viewer = $3Dmol.createViewer("mol-viewer", {
      defaultcolors: $3Dmol.rasmolElementColors,
    });

    console.warn('viewer.setViewStyle({style:"outline"})');

    api.visualization.viewer = viewer;
    viewer.setBackgroundColor(0xffffff);

    // let fetchPromise = fetch("https://files.rcsb.org/view/1XDN.pdb")
    //   // let fetchPromise = fetch("https://files.rcsb.org/view/2HU4.pdb")
    //   // let fetchPromise = fetch("https://files.rcsb.org/view/4AV1.pdb")  // nucleic
    //   // let fetchPromise = fetch("https://files.rcsb.org/view/1HQ3.pdb")  // has ions
    //   // let fetchPromise = fetch("https://files.rcsb.org/ligands/view/ATP_ideal.sdf")
    //   .then((response) => response.text())
    //   .then((text) => {
    //     return loadMolecularModelFromText(text, "pdb", "myfile.pdb");
    //     // return loadMolecularModelFromText(text, "sdf", "myfile.sdf");
    //   });
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
#mol-viewer {
  width: 100%;
  height: 100%;
}
</style>
