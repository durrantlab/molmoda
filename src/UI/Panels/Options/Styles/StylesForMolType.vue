<template>
  <Section
    v-bind:key="styleAndSelForMolType.molType"
    :level="2"
    :title="capitalize(styleAndSelForMolType.molType)"
  >
  {{styleAndSelForMolType}}
    <template v-slot:afterTitle>
      <!-- First, the icon switcher to hide this mol type. -->
      <IconSwitcher
        :useFirst="isVisible"
        :iconID1="['far', 'eye']"
        :iconID2="['far', 'eye-slash']"
        :icon2Style="{ color: 'lightgray' }"
        :width="24"
        @click="toggleVisible(styleAndSelForMolType.molType)"
        :clickable="true"
        title="Visible"
        tipPlacement="left"
      />
    </template>

    <!-- The atoms styling section for this moltype, with optional colorselect
    -->
    <FormSelect
      :id="'atoms-' + styleAndSelForMolType.molType"
      v-model="atomsOption"
      :options="atomsStyleOptions"
      @onChange="updateMolecules(atomsOption)"
    ></FormSelect>
    <ColorSelect
      v-if="atomsOption !== 'atoms-hidden'"
      v-model="styleAndSelForMolType.styleAndSel.style"
      :repName="atomsOption"
      @onChange="updateMolecules(atomsOption)"
      :allowColorCarbons="styleAndSelForMolType.molType !== 'metal'"
      :allowSpectrum="false"
      :allowSecondaryStructure="styleAndSelForMolType.molType === 'protein'"
    />

    <!-- The protein (backbone) styling section for this moltype, with optional
    colorselect -->
    <FormSelect
      v-if="styleAndSelForMolType.molType === 'protein'"
      :id="'protein-' + styleAndSelForMolType.molType"
      v-model="backboneOption"
      :options="proteinStyleOptions"
      @onChange="updateMolecules(backboneOption)"
    ></FormSelect>
    <ColorSelect
      v-if="backboneOption !== 'backbone-hidden'"
      v-model="styleAndSelForMolType.styleAndSel.style"
      :repName="backboneOption"
      @onChange="updateMolecules(backboneOption)"
      :allowColorByElement="false"
      :allowColorCarbons="false"
    />

    <!-- The surface styling section for this moltype, with optional colorselect
    -->
    <FormSelect
      v-if="styleAndSelForMolType.molType !== 'metal'"
      :id="'surface-' + styleAndSelForMolType.molType"
      v-model="surfaceOption"
      :options="metalStyleOptions"
      @onChange="updateMolecules(surfaceOption)"
    ></FormSelect>
    <ColorSelect
      v-if="surfaceOption !== 'surface-hidden'"
      v-model="styleAndSelForMolType.styleAndSel.style"
      :repName="surfaceOption"
      @onChange="updateMolecules(surfaceOption)"
      :allowSpectrum="false"
      :allowSecondaryStructure="styleAndSelForMolType.molType === 'protein'"
    />
  </Section>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment, no-case-declarations */

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
import isEqual from "lodash.isequal";
import { IStyleAndSel, MolType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import IconSwitcher from "@/UI/Navigation/TitleBar/IconBar/IconSwitcher.vue";
import FormFull from "@/UI/Forms/FormFull/FormFull.vue";
import ColorSelect from "./ColorSelect/ColorSelect.vue";
import { IFormOption } from "@/UI/Forms/FormFull/FormFullInterfaces";

export interface IStyleAndSelForMolType {
  styleAndSel: IStyleAndSel;
  molType: MolType;
}

/**
 * StylesForMolType component
 */
@Options({
  components: {
    Section,
    FormSelect,
    IconSwitcher,
    FormFull,
    ColorSelect,
  },
})
export default class StylesForMolType extends Vue {
  @Prop({ required: true }) styleAndSelForMolType!: IStyleAndSelForMolType;

  isVisible = true;
  atomsOption = "atoms-hidden";
  backboneOption = "backbone-hidden";
  surfaceOption = "surface-hidden";

  proteinStyleOptions = [
    { description: "Backbone: Hidden", val: "backbone-hidden" },
    { description: "Backbone: Cartoon", val: "cartoon" },
    // {description: 'Protein: Tubes', val: 'tubes'},
  ] as IFormOption[];

  metalStyleOptions = [
    { description: "Surface: Hidden", val: "surface-hidden" },
    { description: "Surface", val: "surface" },
  ] as IFormOption[];

  /**
   * Get the atom styles to use as options in the select. This is a computed
   * rather than data variable because it changes depending on other variables.
   *
   * @returns {IFormOption[]}  Array of option objects.
   */
  get atomsStyleOptions(): IFormOption[] {
    let options = [
      { description: "Atoms: Hidden", val: "atoms-hidden" },
    ] as IFormOption[];

    if (this.styleAndSelForMolType.molType !== "metal") {
      options.push(
        ...([
          { description: "Atoms: Lines", val: "line" },
          { description: "Atoms: Sticks", val: "stick" },
        ] as IFormOption[])
      );
    }

    options.push({
      description: "Atoms: Spheres",
      val: "sphere",
    } as IFormOption);

    return options;
  }

  /**
   * Toggle the visibility of a molecule.
   *
   * @param {MolType} type  The type of molecule to toggle.
   */
  toggleVisible(type: MolType) {
    this.isVisible = !this.isVisible;
    let nodesOfThisType = getNodesOfType(
      this.$store.state["molecules"],
      type,
      true // onlyConsiderVisible
    );
    for (let node of nodesOfThisType) {
      node.visible = this.isVisible;
      node.viewerDirty = true;
    }
  }

  /**
   * Set the initial values to use in the select.
   *
   * @param {IStyleAndSel} styleInfo  The style name to selectino to use.
   */
  private _setInitialSelectVals(styleInfo: IStyleAndSel) {
    if (styleInfo.style === undefined) {
      // Happens when used has hidden all styles.
      styleInfo.style = {};
    }

    if (styleInfo.style.sphere) {
      this.atomsOption = "sphere";
    } else if (styleInfo.style.stick) {
      this.atomsOption = "stick";
    } else if (styleInfo.style.line) {
      this.atomsOption = "line";
    } else {
      this.atomsOption = "atoms-hidden";
    }

    if (styleInfo.style.cartoon) {
      this.backboneOption = "cartoon";
    } else {
      this.backboneOption = "backbone-hidden";
    }

    if (styleInfo.style.surface) {
      this.surfaceOption = "surface";
    } else {
      this.surfaceOption = "surface-hidden";
    }
  }

  /**
   * Update the style of a molecule.
   *
   * @param {string} repName  The name of the representation. For example,
   *                          "atoms-hidden".
   */
  updateMolecules(repName: string) {
    // TODO: Seems like this should happen in Styles.vue
    let style = this.styleAndSelForMolType.styleAndSel
      ? this.styleAndSelForMolType.styleAndSel.style
      : {};

    // Deal items with hidden visualizations. Delete entries that are
    // incompatible with hidden.
    switch (repName) {
      case "atoms-hidden":
        if (style.line) {
          delete style.line;
        }
        if (style.stick) {
          delete style.stick;
        }
        if (style.sphere) {
          delete style.sphere;
        }
        break;
      case "backbone-hidden":
        if (style.cartoon) {
          delete style.cartoon;
        }
        break;
      case "surface-hidden":
        if (style.surface) {
          delete style.surface;
        }
        break;
      default:
        // Not hidden, so use specified value.

        // This required to deal with restoring a viz after everything set to
        // hidden.
        if (this.styleAndSelForMolType.styleAndSel === undefined) {
          this.styleAndSelForMolType.styleAndSel = {
            selection: {},
            style: {},
          };
        }

        // @ts-ignore
        let val = this.styleAndSelForMolType.styleAndSel.style[repName];
        if (val === undefined) {
          val = {};
        }

        (style as any)[repName] = val;
    }

    // In case of atoms, representations are mutually exclusive.
    switch (repName) {
      case "line":
        if (style.stick) {
          delete style.stick;
        }
        if (style.sphere) {
          delete style.sphere;
        }
        break;
      case "stick":
        if (style.line) {
          delete style.line;
        }
        if (style.sphere) {
          delete style.sphere;
        }
        break;
      case "sphere":
        if (style.line) {
          delete style.line;
        }
        if (style.stick) {
          delete style.stick;
        }
        break;
    }

    // iterate through terminal nodes
    let molecules = this.$store.state["molecules"];
    for (let node of getTerminalNodes(molecules)) {
      if (!node.type) {
        continue;
      }
      if (!node.stylesSels) {
        continue;
      }
      if (!node.visible) {
        continue;
      }

      // Check if the node type matches this style
      if (node.type === this.styleAndSelForMolType.molType) {
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

    console.log("New molecules:", molecules);

    this.$store.commit("setVar", {
      name: "molecules",
      val: molecules,
    });

    // this.$emit("update:styleName", e.target.value);
  }

  /**
   * Capitalize the first letter of a string.
   *
   * @param {string} str  The string to capitalize.
   * @returns {string} The capitalized string.
   */
  capitalize(str: string): string {
    return capitalize(str);
  }

  /**
   * Runs when the Vue component is mounted.
   */
  mounted() {
    // Start by selecting defaults TODO: Actually, not sure this is necessary.
    // All components will always have SOME style (assigned at load).

    // this.translateStyleToComponent(this.styleName.style);
    this._setInitialSelectVals(this.styleAndSelForMolType.styleAndSel);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
