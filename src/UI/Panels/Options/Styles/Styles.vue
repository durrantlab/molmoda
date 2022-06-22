<template>
  <Section title="Styles">
    <Style
      v-for="styleAndName in stylesAndNames"
      v-bind:key="styleAndName.name"
      :styleAndName="styleAndName"
    ></Style>
  </Section>
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import Section from "@/UI/Layout/Section.vue";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import { capitalize } from "@/Core/Utils";
import FormSelect from "@/UI/Forms/FormSelect.vue";
import Style, { IStyleName } from "./Style.vue";

// @ts-ignore
import isEqual from "lodash/isEqual";
import { unbondedAtomsStyle } from "@/FileSystem/LoadMolecularModels/Lookups/DefaultStyles";
import { IStyle } from "@/UI/Navigation/TreeView/TreeInterfaces";

interface IStyleCount {
  style: IStyle,
  count: number,
}

@Options({
  components: {
    Section,
    FormSelect,
    Style
  },
})
export default class Styles extends Vue {
  get stylesAndNames(): IStyleName[] {
    let allStyles: { [key: string]: IStyle[] } = {};
    let molecules = this.$store.state["molecules"];

    // Get the styles for all visible components, organized by molecule type.
    for (let node of getTerminalNodes(molecules)) {
      if (!node.type) { continue; }
      // if (node.type === "metal") { continue; }  // Can't change metal style
      if (!node.styles) { continue; }
      if (!node.visible) { continue; }

      if (allStyles[node.type] === undefined) {
        allStyles[node.type] = [];
      }

      allStyles[node.type].push(...node.styles);
    }

    // For each type, get the styles that all molecules have in common. Note
    // that a given type may have no styles in common, in which case it will be
    // associated with an empty list.
    let allStylesAndCounts: {[key: string]: IStyleCount[]} = {};
    for (let type in allStyles) {
      let styles = allStyles[type];
      let stylesAndCounts = this.convertStyleToStyleCount([styles[0]]);
      for (let i = 1; i < styles.length; i++) {
        let newStyleCounts = this.convertStyleToStyleCount([styles[i]]);
        stylesAndCounts = this.tallyStyles(stylesAndCounts, newStyleCounts);
      }

      // Sort the styles by count, descending.
      stylesAndCounts.sort((a, b) => b.count - a.count);

      allStylesAndCounts[type] = stylesAndCounts;
    }

    return Object.keys(allStylesAndCounts).map(
      (k: string) => {
        return { 
          name: k, 
          style: allStylesAndCounts[k].length > 0 
            ? allStylesAndCounts[k][0].style  // First one is the most common.
            : {}  // No styles for this type.
        } as IStyleName;
      }
    );
  }

  private convertStyleToStyleCount(styles: IStyle[]): IStyleCount[] {
    return styles.map((s: IStyle): IStyleCount => {
      return { style: s, count: 1 };
    });
  }

  private tallyStyles(stylesAndCounts: IStyleCount[], newStyleCounts: IStyleCount[]): IStyleCount[] {
    // TODO: Move to Utils.ts?
    // Assuming stylesAndCounts and newStyleCounts don't contain duplicates.

    for (let newStyleCount of newStyleCounts) {
      let styleExistsInStylesAndCounts = false;
      for (let styleAndCount of stylesAndCounts) {
        if (isEqual(styleAndCount.style, newStyleCount.style)) {
          styleAndCount.count++;
          styleExistsInStylesAndCounts = true;
          break;
        }
      }
      if (!styleExistsInStylesAndCounts) {
        stylesAndCounts.push(newStyleCount);
      }
    }

    return stylesAndCounts;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
