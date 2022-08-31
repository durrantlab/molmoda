<template>
  <div id="mol-viewer"></div>
</template>

<script lang="ts">
/* eslint-disable no-unreachable */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";
import { Watch } from "vue-property-decorator";

import * as api from "@/Api/";
import {
  getAllNodesFlattened,
  getTerminalNodes,
} from "@/UI/Navigation/TreeView/TreeUtils";

import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { unbondedAtomsStyle } from "@/FileSystem/LoadSaveMolModels/Lookups/DefaultStyles";
import { dynamicImports } from "@/Core/DynamicImports";

@Options({})
export default class ViewerPanel extends Vue {
  molCache: { [id: string]: any } = {};

  // Need to keep track of surfaces, associating them with molecule ids.
  surfaces: { [id: string]: number[] } = {};
  surfaceType = 2;

  get treeview(): any {
    return this.$store.state["molecules"];
  }

  @Watch("treeview", { immediate: false, deep: true })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTreeviewChanged(
    allMolecules: IMolContainer[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _oldAllMolecules: IMolContainer[]
  ) {
    if (allMolecules.length === 0) {
      this._clearCache();
      return;
    }
    this._updateStylesAndZoom();
  }

  private _clearCache() {
    for (const id in this.molCache) {
      this._removeModel(id);
    }
    api.visualization.viewer.render();
  }

  private _updateStylesAndZoom() {
    let visibleTerminalNodeModels = this._checkStyleChanges();
    this._zoomPerFocus(visibleTerminalNodeModels);
  }

  private _clearSurface(mol: IMolContainer | string) {
    let id = typeof mol === "string" ? mol : mol.id;
    if (id && this.surfaces[id]) {
      for (const surface of this.surfaces[id]) {
        api.visualization.viewer.removeSurface(surface);
        delete this.surfaces[id];
      }
    }
  }

  private _removeModel(id: string) {
    let mol = this.molCache[id];

    // Clear any surfaces
    this._clearSurface(id);

    // remove from viewer
    api.visualization.viewer.removeModel(mol);

    // Remove from cache
    delete this.molCache[id];

    // Note that not calling render here. Need to call it elsewhere fore these
    // changes to appear in 3dmoljs viewer.
  }

  private _removeOldModels(terminalNodes: IMolContainer[]): void {
    // Remove any molecules not presently in the terminal nodes.

    // Get the ids of the actual terminal nodes (should have deleted element
    // already removed)
    let idsOfTerminalNodes = terminalNodes.map((node) => node.id);

    // If the user has deleted one, the system has not yet removed it from the
    // cache. Make note of that here.
    let idsOfMolsToDelete: string[] = [];
    for (let molCacheId in this.molCache) {
      if (idsOfTerminalNodes.indexOf(molCacheId) === -1) {
        // There's an id in the cache that isn't in the tree.
        idsOfMolsToDelete.push(molCacheId);
      }
    }

    // Remove it from the cache, viewer, etc.
    idsOfMolsToDelete.forEach((id: string) => {
      this._removeModel(id);

      // Remove from terminal nodes (local variable) so you don't regenerate it
      // again.
      // terminalNodes = terminalNodes.filter((node) => node.id !== id);
    });

    // return terminalNodes;
  }

  private _checkStyleChanges(): any[] {
    let visibleTerminalNodeModels: any[] = [];
    let terminalNodes = getTerminalNodes(this.treeview);

    this._removeOldModels(terminalNodes);

    for (const mol of terminalNodes) {
      let id = mol.id as string;

      if (mol.visible) {
        visibleTerminalNodeModels.push(mol.model);
      }

      // If it's not in the cache, the system has probably not yet loaded the
      // molecule. Always load it.
      if (!this.molCache[id]) {
        console.log("Loading: " + id);
        let visMol = api.visualization.viewer.addRawModel_JDD(mol.model);
        this.molCache[id] = visMol;
        this._makeAtomsHoverableAndClickable({ model: visMol });
      }

      // If the system has marked a molecule "dirty", apply a new style.
      if (mol.viewerDirty) {
        if (!mol.visible) {
          // hide it.
          (mol.model as any).hide();

          // Clear any surfaces associated with this molecule.
          this._clearSurface(mol);
        } else if (mol.stylesSels) {
          // Styles to apply, so make sure it's visible.
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
              (mol.model as any).setStyle(
                styleSel.selection,
                styleSel.style,
                true
              );
              if (styleSel.style.sphere) {
                spheresUsed = true;
              }
            } else {
              // It's a surface
              api.visualization.viewer
                .addSurface(
                  // $3Dmol.SurfaceType.VDW,
                  // $3Dmol.SurfaceType.MS,
                  this.surfaceType,
                  styleSel.style.surface, // style
                  { model: mol.model as any } // selection
                )
                .then((surface: any) => {
                  if (mol.id) {
                    this.surfaces[mol.id] = this.surfaces[mol.id] || [];
                    this.surfaces[mol.id].push(surface);
                  }
                  return;
                })
                .catch((err: any) => {
                  console.log(err);
                });
            }
          }

          // Regardless of specified style, anything not bound to other molecule
          // should be visible.
          if (mol.stylesSels.length > 0 && !spheresUsed) {
            // If there's any style, no style is spheres, make sure unbonded
            // atoms are visible.
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

  private _zoomPerFocus(visibleTerminalNodeModels: any[]) {
    let molsToFocus: IMolContainer[] = [];
    for (const mol of getAllNodesFlattened(this.treeview)) {
      if (mol.focused) {
        if (!mol.nodes) {
          // Already terminal
          molsToFocus = [mol.model as any];
        } else {
          molsToFocus = getTerminalNodes(mol.nodes).map(
            (n) => n.model
          ) as any[];
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function (atom: any, viewer: any, _event: any, _container: any) {
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function (atom: any, viewer: any, _event: any, _container: any) {
        if (atom.label) {
          setTimeout(() => {
            viewer.removeLabel(atom.label);
            delete atom.label;
          }, 1000);
        }
      }
    );

    api.visualization.viewer.setClickable(
      {},
      true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (atom: any, _viewer: any, _event: any, _container: any) => {
        api.visualization.viewer.zoomTo(
          { x: atom.x, y: atom.y, z: atom.z },
          500,
          true
        );
        this.$store.commit("clearFocusedMolecule", false);
      }
    );
  }

  // Mounted
  mounted() {
    dynamicImports.mol3d.module
      .then(($3Dmol: any) => {
        this.surfaceType = $3Dmol.SurfaceType.MS;

        let viewer = $3Dmol.createViewer("mol-viewer", {
          defaultcolors: $3Dmol.rasmolElementColors,
        });

        // @ts-ignore
        window["viewer"] = viewer;

        console.warn('viewer.setViewStyle({style:"outline"})');

        api.visualization.viewer = viewer;
        viewer.setBackgroundColor(0xffffff);
        return;
      })
      .catch((err: any) => {
        console.log(err);
      });

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
