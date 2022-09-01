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
        title="Visible"
        tipPlacement="left"
      />
    </template>
    <!-- <span style="color: red">{{ atomsOption }}</span> -->
    <FormSelect
      :id="'atoms-' + styleName.name"
      v-model="atomsOption"
      :options="atomsStyleOptions"
      @onChange="updateMolecules(atomsOption)"
    ></FormSelect>
    <ColorStyle
      v-if="atomsOption !== 'atoms-hidden'"
      v-model="styleName.styleAndSel.style"
      :repName="atomsOption"
      @onChange="updateMolecules(atomsOption)"
      :allowColorCarbons="styleName.name !== 'metal'"
      :allowSpectrum="false"
      :allowSecondaryStructure="styleName.name === 'protein'"
    />

    <FormSelect
      v-if="styleName.name === 'protein'"
      :id="'protein-' + styleName.name"
      v-model="backboneOption"
      :options="[
        { description: 'Backbone: Hidden', val: 'backbone-hidden' },
        { description: 'Backbone: Cartoon', val: 'cartoon' },
        // {description: 'Protein: Tubes', val: 'tubes'},
      ]"
      @onChange="updateMolecules(backboneOption)"
    ></FormSelect>
    <ColorStyle
      v-if="backboneOption !== 'backbone-hidden'"
      v-model="styleName.styleAndSel.style"
      :repName="backboneOption"
      @onChange="updateMolecules(backboneOption)"
      :allowColorByElement="false"
      :allowColorCarbons="false"
    />

    <FormSelect
      v-if="styleName.name !== 'metal'"
      :id="'surface-' + styleName.name"
      v-model="surfaceOption"
      :options="[
        { description: 'Surface: Hidden', val: 'surface-hidden' },
        { description: 'Surface', val: 'surface' },
      ]"
      @onChange="updateMolecules(surfaceOption)"
    ></FormSelect>
    <ColorStyle
      v-if="surfaceOption !== 'surface-hidden'"
      v-model="styleName.styleAndSel.style"
      :repName="surfaceOption"
      @onChange="updateMolecules(surfaceOption)"
      :allowSpectrum="false"
      :allowSecondaryStructure="styleName.name === 'protein'"
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
import ColorStyle from "./ColorStyle/ColorStyle.vue";

export interface IStyleName {
  styleAndSel: IStyleAndSel;
  name: MolType;
}

/**
 * Style component
 */
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

  isVisible = true;
  atomsOption = "atoms-hidden";
  backboneOption = "backbone-hidden";
  surfaceOption = "surface-hidden";

  get atomsStyleOptions(): any {
    let options = [{ description: "Atoms: Hidden", val: "atoms-hidden" }];

    if (this.styleName.name !== "metal") {
      options.push(
        ...[
          { description: "Atoms: Lines", val: "line" },
          { description: "Atoms: Sticks", val: "stick" },
        ]
      );
    }

    options.push({ description: "Atoms: Spheres", val: "sphere" });

    return options;
  }

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

  updateMolecules(repName: string): void {
    // TODO: Seems like this should happen in Styles.vue
    let style = this.styleName.styleAndSel
      ? this.styleName.styleAndSel.style
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
        if (this.styleName.styleAndSel === undefined) {
          this.styleName.styleAndSel = {
            selection: {},
            style: {},
          };
        }

        // @ts-ignore
        let val = this.styleName.styleAndSel.style[repName];
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

    console.log("New molecules:", molecules);

    this.$store.commit("setVar", {
      name: "molecules",
      val: molecules,
    });

    // this.$emit("update:styleName", e.target.value);
  }

  capitalize(str: string): string {
    return capitalize(str);
  }

  mounted() {
    // Start by selecting defaults TODO: Actually, not sure this is necessary.
    // All components will always have SOME style (assigned at load).

    // this.translateStyleToComponent(this.styleName.style);
    this._setInitialSelectVals(this.styleName.styleAndSel);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
