<template>
  <Section
    v-bind:key="styleName.name"
    :level="2"
    :title="capitalize(styleName.name)"
  >
    <template v-slot:afterTitle>
      <IconSwitcher
        :useFirst="isVisible"
        :iconID1="['far', 'eye']"
        :iconID2="['far', 'eye-slash']"
        :icon2Style="{ color: 'lightgray' }"
        :width="24"
        @click="toggleVisible(styleName.name)"
        :clickable="true"
      />
    </template>
    <!-- <span style="color: red">{{ atomsOption }}</span> -->
    <FormSelect
      :id="'atoms-' + styleName.name"
      v-model="atomsOption"
      :options="[
        { description: 'Atoms: Hidden', val: 'atoms-hidden' },
        { description: 'Atoms: Lines', val: 'line' },
        { description: 'Atoms: Sticks', val: 'stick' },
        { description: 'Atoms: Spheres', val: 'sphere' },
      ]"
      @changed="updateMolecules(atomsOption)"
    ></FormSelect>
    <!-- {{styleName.styleAndSel.style}} MOOOOO -->
    <ColorStyle 
      v-if="atomsOption !== 'atoms-hidden'" 
      v-model="styleName.styleAndSel.style" 
    />
    <span style="color: red">NOT REACTIVE: </span>{{ styleName }}

    <FormSelect
      v-if="styleName.name === 'protein'"
      :id="'protein-' + styleName.name"
      v-model="backboneOption"
      :options="[
        { description: 'Backbone: Hidden', val: 'backbone-hidden' },
        { description: 'Backbone: Cartoon', val: 'cartoon' },
        // {description: 'Protein: Tubes', val: 'tubes'},
      ]"
      @changed="updateMolecules(backboneOption)"
    ></FormSelect>

    <FormSelect
      v-if="styleName.name !== 'metal'"
      :id="'surface-' + styleName.name"
      v-model="surfaceOption"
      :options="[
        { description: 'Surface: Hidden', val: 'surface-hidden' },
        { description: 'Surface', val: 'surface' },
      ]"
      @changed="updateMolecules(surfaceOption)"
    ></FormSelect>

    <!-- <FormFull v-model="colorForm"></FormFull> -->
    <!-- <ColorStyle /> -->
  </Section>
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import Section from "@/UI/Layout/Section.vue";
import {
  getNodesOfType,
  getTerminalNodes,
} from "@/UI/Navigation/TreeView/TreeUtils";
import { capitalize } from "@/Core/Utils";
// import Radios from "@/UI/Forms/Radios/Radios.vue";
import FormSelect from "@/UI/Forms/FormSelect.vue";

// @ts-ignore
import isEqual from "lodash/isEqual";
import { unbondedAtomsStyle } from "@/FileSystem/LoadMolecularModels/Lookups/DefaultStyles";
import { IStyleAndSel } from "@/UI/Navigation/TreeView/TreeInterfaces";
import IconSwitcher from "@/UI/Navigation/TitleBar/IconBar/IconSwitcher.vue";
import FormFull from "@/UI/Forms/FormFull.vue";
import { FormElemType } from "@/UI/Forms/FormFull.vue";
import ColorStyle from "./ColorStyle.vue";

export interface IStyleName {
  styleAndSel: IStyleAndSel;
  name: string;
}

@Options({
  components: {
    Section,
    FormSelect,
    IconSwitcher,
    FormFull,
    ColorStyle,
  },
})
export default class Style extends Vue {
  @Prop({ required: true }) styleName!: IStyleName;

  isVisible: boolean = true;
  atomsOption = "atoms-hidden";
  backboneOption = "backbone-hidden";
  surfaceOption = "surface-hidden";

  toggleVisible(name: string) {
    this.isVisible = !this.isVisible;
    let nodesOfThisType = getNodesOfType(
      this.$store.state["molecules"],
      name,
      true // onlyConsiderVisible
    );
    for (let node of nodesOfThisType) {
      node.visible = this.isVisible;
      node.viewerDirty = true;
    }
  }

  private setInitialSelectVals(styleInfo: IStyleAndSel) {
    if (styleInfo.style === undefined) {
      // Happens when all styles have been previously set to hidden.
      styleInfo.style = {};
    }

    if (styleInfo.style.sphere) { this.atomsOption = "sphere"; } 
    else if (styleInfo.style.stick) { this.atomsOption = "stick"; } 
    else if (styleInfo.style.line) { this.atomsOption = "line"; } 
    else { this.atomsOption = "atoms-hidden"; }

    if (styleInfo.style.cartoon) { this.backboneOption = "cartoon"; }
    else { this.backboneOption = "backbone-hidden"; }

    if (styleInfo.style.surface) { this.surfaceOption = "surface"; }
    else { this.surfaceOption = "surface-hidden"; }
  }

  updateMolecules(val: string): void {
    // console.log(this.styleName, val, componentLbl);
    // console.log(val, componentLbl);

    let style = this.styleName.styleAndSel ? this.styleName.styleAndSel.style : {};

    // Deal items with hidden visualizations, which are equivalent to 3Dmoljs
    // styles.
    switch (val) {
      case "atoms-hidden":
        if (style.line) { delete style.line; }
        if (style.stick) { delete style.stick; }
        if (style.sphere) { delete style.sphere; }
        break;
      case "backbone-hidden":
        if (style.cartoon) { delete style.cartoon; }
        break;
      case "surface-hidden":
        if (style.surface) { delete style.surface; }
        break;
      default:
        // Not hidden, so use specified value.
        (style as any)[val] = {}; // TODO: Need to use colors, not empty object.
    }

    // In case of atoms, representations are mutually exclusive.
    switch (val) {
      case "line":
        if (style.stick) { delete style.stick; }
        if (style.sphere) { delete style.sphere; }
        break;
      case "stick":
        if (style.line) { delete style.line; }
        if (style.sphere) { delete style.sphere; }
        break;
      case "sphere":
        if (style.line) { delete style.line; }
        if (style.stick) { delete style.stick; }
        break;
    }

    // iterate through terminal nodes
    let molecules = this.$store.state["molecules"];
    for (let node of getTerminalNodes(molecules)) {
      if (!node.type) { continue; }
      if (!node.stylesSels) { continue; }
      if (!node.visible) { continue; }

      // Check if the node type matches this style
      if (node.type === this.styleName.name) {
        // Add the styles to the node list if it's not empty ({}).
        node.stylesSels = [];
        if (!isEqual(style, {})) {
          node.stylesSels.push({
            style: style,
            selection: {},
          });
        }
        // Mark this for rerendering in viewer.
        node.viewerDirty = true;
      }
    }

    this.$store.commit("setVar", {
      name: "molecules",
      val: molecules,
    });

    // this.$emit("update:styleName", e.target.value);
  }

  capitalize(str: string): string { return capitalize(str); }

  mounted() {
    // Start by selecting defaults TODO: Actually, not sure this is necessary.
    // All components will always have SOME style (assigned at load).

    // this.translateStyleToComponent(this.styleName.style);
    this.setInitialSelectVals(this.styleName.styleAndSel);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
