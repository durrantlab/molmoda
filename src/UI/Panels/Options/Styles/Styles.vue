<template>
  <Section title="Styles">
    <span
      v-for="styleAndName, idx in stylesAndNames"
      v-bind:key="styleAndName.name"
    >
      <Style :styleName="stylesAndNames[idx]"></Style>
    </span>
    </Section>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";
import Section from "@/UI/Layout/Section.vue";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import FormSelect from "@/UI/Forms/FormSelect.vue";
import Style, { IStyleName } from "./Style.vue";

// @ts-ignore
import isEqual from 'lodash.isequal';
import { IStyleAndSel } from "@/UI/Navigation/TreeView/TreeInterfaces";

interface IStyleCount {
  styleAndSel: IStyleAndSel,
  count: number,
}

/**
 * Styles component
 */
@Options({
  components: {
    Section,
    FormSelect,
    Style
  },
})
export default class Styles extends Vue {
  get stylesAndNames(): IStyleName[] {
    let allStylesAndSels: { [key: string]: IStyleAndSel[] } = {};
    let molecules = this.$store.state["molecules"];

    // Get the styles for all visible components, organized by molecule type.
    for (let node of getTerminalNodes(molecules)) {
      if (!node.type) { continue; }
      // if (node.type === "metal") { continue; }  // Can't change metal style
      if (!node.stylesSels) { continue; }
      if (!node.visible) { continue; }

      if (allStylesAndSels[node.type] === undefined) {
        allStylesAndSels[node.type] = [];
      }

      allStylesAndSels[node.type].push(...node.stylesSels);
    }

    // For each type, get the styles that all molecules have in common. Note
    // that a given type may have no styles in common, in which case it will be
    // associated with an empty list.
    let allStylesAndCounts: {[key: string]: IStyleCount[]} = {};
    for (let type in allStylesAndSels) {
      let styles = allStylesAndSels[type];
      
      let stylesAndCounts = this._convertStyleToStyleCount([styles[0]]);
      for (let i = 1; i < styles.length; i++) {
        let newStyleCounts = this._convertStyleToStyleCount([styles[i]]);
        stylesAndCounts = this._tallyStyles(stylesAndCounts, newStyleCounts);
      }

      // Sort the styles by count, descending.
      stylesAndCounts.sort((a, b) => b.count - a.count);

      allStylesAndCounts[type] = stylesAndCounts;
    }

    let allStylesAndCountsInfo: IStyleName[] = Object.keys(allStylesAndCounts).map(
      (k: string) => {
        return { 
          name: k, 
          styleAndSel: allStylesAndCounts[k].length > 0 
            ? allStylesAndCounts[k][0].styleAndSel  // First one is the most common.
            : {}  // No styles for this type.
        } as IStyleName;
      }
    );

    return allStylesAndCountsInfo;
  }

  private _convertStyleToStyleCount(styles: IStyleAndSel[]): IStyleCount[] {
    return styles.map((s: IStyleAndSel): IStyleCount => {
      return { styleAndSel: s, count: 1 };
    });
  }

  private _tallyStyles(stylesAndCounts: IStyleCount[], newStyleCounts: IStyleCount[]): IStyleCount[] {
    // TODO: Move to Utils.ts?
    // Assuming stylesAndCounts and newStyleCounts don't contain duplicates.

    for (let newStyleCount of newStyleCounts) {
      let styleExistsInStylesAndCounts = false;
      for (let styleAndCount of stylesAndCounts) {
        if (isEqual(styleAndCount.styleAndSel, newStyleCount.styleAndSel)) {
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
