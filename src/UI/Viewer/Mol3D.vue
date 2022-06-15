<template>
  <div id="mol-viewer"></div>
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";
import { Watch } from "vue-property-decorator";

import { loadMolecularModelFromText } from "../../FileSystem/LoadMolecularModels/LoadMolecularModels";
import * as api from "@/Api/";
import { getTerminalNodes } from "../TreeView/TreeUtils";

// @ts-ignore
import * as tmp from "./3Dmol-nojquery.JDD";
import { IMolEntry } from "@/UI/TreeView/TreeInterfaces";
const $3Dmol = tmp as any;

@Options({
  props: {
    // msg: String,
  },
})
export default class Mol3D extends Vue {
  //   msg!: string;

  get treeview(): any {
    return this.$store.state["treeview"]["treeData"];
  }

  @Watch("treeview", { immediate: false, deep: true })
  onTreeviewChanged(val: IMolEntry[], oldVal: IMolEntry[]) {
    // TODO: For now, just reload everything. If this gets slow, good to look
    // for changes using hashes.

    // Remove all models from the viewer.
    api.viewer.viewer.clear();

    // Use a recursive function to find the terminal leaves of mols.
    let terminalNodes = getTerminalNodes(val);
    for (const leaf of terminalNodes) {
      api.viewer.viewer.addRawModel_JDD(leaf.mol.model);
      if (leaf.mol.styles) {
        for (const style of leaf.mol.styles) {
          leaf.mol.model.setStyle(style.selection, style.style);
        }
      } else {
        // If not specified
        leaf.mol.model.setStyle({}, {line: {}});
      }
    }
    api.viewer.viewer.zoomTo();
    api.viewer.viewer.render();

    console.log("Changed!", val);
  }

  // Mounted
  mounted() {
    let viewer = $3Dmol.createViewer("mol-viewer", {
      defaultcolors: $3Dmol.rasmolElementColors,
    });
    viewer.setBackgroundColor(0xffffff);

    // let fetchPromise = fetch("https://files.rcsb.org/view/1XDN.pdb")
      let fetchPromise = fetch("https://files.rcsb.org/view/2HU4.pdb")
      // let fetchPromise = fetch("https://files.rcsb.org/view/4AV1.pdb")  // nucleic
      // let fetchPromise = fetch("https://files.rcsb.org/view/1HQ3.pdb")  // has ions
      // let fetchPromise = fetch("https://files.rcsb.org/ligands/view/ATP_ideal.sdf")
      .then((response) => response.text())
      .then((text) => {
        return loadMolecularModelFromText(text, "pdb", "myfile.pdb");
        // return loadMolecularModelFromText(text, "sdf", "myfile.sdf");
      });
    // .then((models: any[]) => {
    //   for (let model of models) {
    //     viewer.addRawModel_JDD(model);
    //   }
    //   viewer.zoomTo();
    //   viewer.render();
    // });

    // loadMolecularModelFromText(mol2Txt, "mol2")

    // let mol = viewer.makeGLModel_JDD(mol2Txt, "mol2");
    // console.log(mol);
    // viewer.addRawModel_JDD(mol);

    // See createModelFrom: https://3dmol.csb.pitt.edu/doc/$3Dmol.viewer.html

    // let receptorModel = viewer.addModel(mol2Txt, "mol2");

    api.viewer.viewer = viewer;
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
