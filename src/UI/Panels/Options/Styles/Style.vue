<template>
  <Section
    v-bind:key="styleAndName.name"
    :level="2"
    :title="capitalize(styleAndName.name)"
  >
    <FormSelect
      :id="'atoms-' + styleAndName.name"
      v-model="atomsOption"
      :options="[
        'Atoms: None',
        'Atoms: Lines',
        'Atoms: Sticks',
        'Atoms: Spheres',
      ]"
      @changed="translateComponentToStyle"
    ></FormSelect>

    <FormSelect
      v-if="styleAndName.name === 'protein'"
      :id="'protein-' + styleAndName.name"
      v-model="proteinOption"
      :options="['Protein: None', 'Protein: Cartoon', 'Protein: Tubes']"
      @changed="translateComponentToStyle"
    ></FormSelect>

    <FormSelect
      v-if="styleAndName.name !== 'metal'"
      :id="'surface-' + styleAndName.name"
      v-model="surfaceOption"
      :options="['Surface: None', 'Surface: Surface']"
      @changed="translateComponentToStyle"
    ></FormSelect>
  </Section>
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import Section from "@/UI/Layout/Section.vue";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import { capitalize } from "@/Core/Utils";
// import Radios from "@/UI/Forms/Radios/Radios.vue";
import FormSelect from "@/UI/Forms/FormSelect.vue";

// @ts-ignore
import isEqual from "lodash/isEqual";
import { unbondedAtomsStyle } from "@/FileSystem/LoadMolecularModels/Lookups/DefaultStyles";
import { IStyle } from "@/UI/Navigation/TreeView/TreeInterfaces";

export interface IStyleName {
  style: IStyle;
  name: string;
}

@Options({
  components: {
    Section,
    FormSelect,
  },
})
export default class Style extends Vue {
  @Prop() styleAndName!: IStyleName;

  atomsOption = "atoms-none";
  proteinOption = "protein-none";
  surfaceOption = "surface-none";

  translateComponentToStyle(): void {
    let style: {[key: string]: any} = {};
    switch (this.atomsOption) {
        case 'atoms-none':
          break;
        case 'atoms-lines':
          style["line"] = {};
          break;
        case 'atoms-sticks':
          style["stick"] = {};
          break;
        case 'atoms-spheres':
          style["sphere"] = {};
          break;
    }

    switch (this.proteinOption) {
        case 'protein-none':
          break;
        case 'protein-cartoon':
          style["cartoon"] = {
            color: "spectrum"
          };
          break;
        case 'protein-tubes':
          style["cartoon"] = {
            color: "spectrum",
            tubes: true
          };
          break;
    }

    switch (this.surfaceOption) {
        case 'surface-none':
          break;
        case 'surface-surface':
          style["surface"] = {};
          break;
    }

    // iterate through terminal nodes
    let molecules = this.$store.state["molecules"];
    for (let node of getTerminalNodes(molecules)) {
      if (!node.type) { continue; }
      if (!node.styles) { continue; }
      if (!node.visible) { continue; }

      if (node.type === this.styleAndName.name) {
        node.styles = [];
        if (!isEqual(style, {})) {
          node.styles.push({
            style: style,
            selection: {},
          });
        }
        node.viewerDirty = true;
      }
    }

    this.$store.commit("setVar", {
      name: "molecules",
      val: molecules,
    });
  }

  private translateStyleToComponent(styleInfo: IStyle) {
    if (styleInfo.style.sphere) {
      this.atomsOption = "atoms-spheres";
    } else if (styleInfo.style.stick) {
      this.atomsOption = "atoms-sticks";
    } else if (styleInfo.style.line) {
      this.atomsOption = "atoms-lines";
    } else {
      this.atomsOption = "atoms-none";
    }

    if (styleInfo.style.cartoon) {
      this.proteinOption = "protein-cartoon";
    } else {
      this.proteinOption = "protein-none";
    }

    if (styleInfo.style.surface) {
      this.surfaceOption = "surface-surface";
    } else {
      this.surfaceOption = "surface-none";
    }
  }

  capitalize(str: string): string {
    return capitalize(str);
  }

  mounted() {
    // Start by selecting defaults TODO: Actually, not sure this is necessary.
    // All components will always have SOME style (assigned at load).
    
    this.translateStyleToComponent(this.styleAndName.style);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
