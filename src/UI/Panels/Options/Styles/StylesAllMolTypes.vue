<template>
    <Section title="">
  <span
   v-for="selStyleForMolType in selStylesForMolTypes"
   v-bind:key='selStyleForMolType.molType'
>
   <StylesForMolType
    :selAndStyle="selStyleForMolType.selAndStyle"
    :molType="selStyleForMolType.molType"
   ></StylesForMolType>
        </span>
  <Section :level="2" title="Hydrogens">
   <FormSelect
    id="hydrogens"
    v-model="hydrogenOptionComputed"
    :options="hydrogenOptions"
    @onChange="updateHydrogens"
   ></FormSelect>
  </Section>
    </Section>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";
import Section from "@/UI/Layout/Section.vue";
import FormSelect from "@/UI/Forms/FormSelect.vue";

// @ts-ignore
import isEqual from "lodash.isequal";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import StylesForMolType from "./StylesForMolType.vue";
import { HydrogenDisplayType, ISelAndStyle } from "@/Core/Styling/SelAndStyleInterfaces";
import { currentSelsAndStyles, customSelsAndStyles, updateStylesInViewer } from "@/Core/Styling/StyleManager";
import { IUserArgOption } from "@/UI/Forms/FormFull/FormFullInterfaces";

interface ISelAndStyleCount {
    selAndStyle: ISelAndStyle;
    count: number;
}

interface ISelStyleForMolType {
    selAndStyle: ISelAndStyle;
    molType: TreeNodeType;
}

/**
 * StylesAllMolTypes component. This is the component that allows the user to
 * set style and colors on all molecule types. This is the "parent" component
 * that gets used in StylesPanel.vue.
 */
@Options({
    components: {
        Section,
        FormSelect,
        StylesForMolType,
    },
})
export default class StylesAllMolTypes extends Vue {
    hydrogenOptions: IUserArgOption[] = [
        { description: "Show All", val: HydrogenDisplayType.All },
        { description: "Polar Only", val: HydrogenDisplayType.Polar },
        { description: "Hide All", val: HydrogenDisplayType.None },
    ];

    /**
     * Computed property for the hydrogen display option.
     * This avoids side-effects in the getter by deriving the value from the current state.
     *
     * @returns {string} The current hydrogen display option.
     */
    get hydrogenOptionComputed(): string {
        // Check the first available style to determine the current setting
        if (this.selStylesForMolTypes.length > 0 && this.selStylesForMolTypes[0].selAndStyle.hydrogens) {
            return this.selStylesForMolTypes[0].selAndStyle.hydrogens;
        }
        return HydrogenDisplayType.All;
    }

    /**
     * Setter for the hydrogen display option.
     * This handles updates when the user changes the selection.
     *
     * @param {string} val The new hydrogen display option.
     */
    set hydrogenOptionComputed(val: string) {
        this.updateHydrogens(val);
    }

    /**
     * Update the hydrogen display setting for all molecules.
     *
     * @param {string} val The new hydrogen display setting.
     */
    updateHydrogens(val: string) {
        const hydrogenType = val as HydrogenDisplayType;

        // Update default styles
        for (const molType in currentSelsAndStyles) {
            const styles = currentSelsAndStyles[molType as TreeNodeType];
            styles.forEach(style => {
                style.hydrogens = hydrogenType;
            });
        }

        // Update custom styles
        for (const styleName in customSelsAndStyles) {
            customSelsAndStyles[styleName].hydrogens = hydrogenType;
        }

        // Trigger viewer update
        updateStylesInViewer();
    }

    /**
     * Get the styles and mol types for the visible molcules. It goes through all
     * these molecules and finds the style elements that are most common, then
     * picks that consensus style (for each mol type).
     *
     * @returns {ISelStyleForMolType[]}  The consensus styles, per mol type.
     */
    get selStylesForMolTypes(): ISelStyleForMolType[] {
        let allSelStylesCollected: { [key: string]: ISelAndStyle[] } = {};
        let molecules = this.$store.state["molecules"] as TreeNodeList;

        // Get the styles for all visible components, organized by molecule type.
        const termNodes = molecules.filters.onlyTerminal;
        for (let idx = 0; idx < termNodes.length; idx++) {
            let node = termNodes.get(idx);
            if (!node.type || !node.styles || !node.visible) {
                continue;
            }
            // if (node.type === "metal") { continue; }  // Can't change metal style

            if (node.type === TreeNodeType.Other) { continue; }  // Can't change other style

            if (allSelStylesCollected[node.type] === undefined) {
                allSelStylesCollected[node.type] = [];
            }

            allSelStylesCollected[node.type].push(...node.styles);
        }

        // For each type, get the styles that all molecules have in common. Note
        // that a given type may have no styles in common, in which case it will be
        // associated with an empty list.
        let allSelStylesAndCounts: { [key: string]: ISelAndStyleCount[] } = {};
        for (let selStyleType in allSelStylesCollected) {
            let selStyles = allSelStylesCollected[selStyleType];

            let selStylesAndCounts = this._initStyleToStyleCount([selStyles[0]]);

            for (let i = 1; i < selStyles.length; i++) {
                let newStyleCounts = this._initStyleToStyleCount([selStyles[i]]);
                selStylesAndCounts = this._tallyStyles(
                    selStylesAndCounts,
                    newStyleCounts
                );
            }

            // Sort the styles by count, descending.
            selStylesAndCounts.sort((a, b) => b.count - a.count);

            allSelStylesAndCounts[selStyleType] = selStylesAndCounts;
        }

        let mostCommonSelStylesPerMolType: ISelStyleForMolType[] = Object.keys(
            allSelStylesAndCounts
        ).map((k: string) => {
            return {
                molType: k,
                selAndStyle:
                    allSelStylesAndCounts[k].length > 0
                        ? allSelStylesAndCounts[k][0].selAndStyle // First one is the most common.
                        : {}, // No styles for this type.
            } as ISelStyleForMolType;
        });
        return mostCommonSelStylesPerMolType;
    }

    /**
     * Convert a list of styles to a list of style counts. Counts are all 1
     * because this serves to initialize the style count list.
     *
     * @param   {ISelAndStyle[]}  styles  The styles
     * @returns {ISelAndStyleCount[]}  The style counts
     */
    private _initStyleToStyleCount(styles: ISelAndStyle[]): ISelAndStyleCount[] {
        return styles.map((s: ISelAndStyle): ISelAndStyleCount => {
            return { selAndStyle: s, count: 1 };
        });
    }

    /**
     * Tally the styles. Assuming stylesAndCounts and newStyleCounts don't contain
     * duplicates. It adds the counts where the styles are the same, and otherwise
     * merges the two counts lists.
     *
     * @param   {ISelAndStyleCount[]}  stylesAndCounts  The existing styles and counts.
     * @param   {ISelAndStyleCount[]}  newStyleCounts   The new styles and counts to
     *                                            add.
     * @returns {ISelAndStyleCount[]} The styles and counts after tallying.
     */
    private _tallyStyles(
        stylesAndCounts: ISelAndStyleCount[],
        newStyleCounts: ISelAndStyleCount[]
    ): ISelAndStyleCount[] {
        for (let newStyleCount of newStyleCounts) {
            let styleExistsInStylesAndCounts = false;
            for (let styleAndCount of stylesAndCounts) {
                if (isEqual(styleAndCount.selAndStyle, newStyleCount.selAndStyle)) {
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
<style scoped lang="scss"></style>
