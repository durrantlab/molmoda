<template>
    <Section title="">
        <span
            v-for="styleForMolType in stylesForMolTypes"
            v-bind:key="styleForMolType.molType"
        >
            <StylesForMolType
                :style="styleForMolType.style"
                :molType="styleForMolType.molType"
            ></StylesForMolType>
        </span>
    </Section>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";
import Section from "@/UI/Layout/Section.vue";
import FormSelect from "@/UI/Forms/FormSelect.vue";

// @ts-ignore
import isEqual from "lodash.isequal";
import { IStyle } from "@/UI/Navigation/TreeView/TreeInterfaces";
import StylesForMolType, { IStyleForMolType } from "./StylesForMolType.vue";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

interface IStyleCount {
    style: IStyle;
    count: number;
}

/**
 * StylesAllMolTypes component
 */
@Options({
    components: {
        Section,
        FormSelect,
        StylesForMolType,
    },
})
export default class StylesAllMolTypes extends Vue {
    /**
     * Get the styles and mol types for the visible molcules. It goes through all
     * these molecules and finds the style elements that are most common, then
     * picks that consensus style (for each mol type).
     *
     * @returns {IStyleForMolType[]}  The consensus styles, per mol type.
     */
    get stylesForMolTypes(): IStyleForMolType[] {
        let allStyles: { [key: string]: IStyle[] } = {};
        let molecules = this.$store.state["molecules"] as TreeNodeList;

        // Get the styles for all visible components, organized by molecule type.
        const termNodes = molecules.filters.onlyTerminal;
        for (let idx = 0; idx < termNodes.length; idx++) {
            let node = termNodes.get(idx);
            if (!node.type || !node.styles || !node.visible) {
                continue;
            }
            // if (node.type === "metal") { continue; }  // Can't change metal style

            if (allStyles[node.type] === undefined) {
                allStyles[node.type] = [];
            }

            allStyles[node.type].push(...node.styles);
        }

        // For each type, get the styles that all molecules have in common. Note
        // that a given type may have no styles in common, in which case it will be
        // associated with an empty list.
        let allStylesAndCounts: { [key: string]: IStyleCount[] } = {};
        for (let type in allStyles) {
            let styles = allStyles[type];

            let stylesAndCounts = this._initStyleToStyleCount([styles[0]]);
            for (let i = 1; i < styles.length; i++) {
                let newStyleCounts = this._initStyleToStyleCount([styles[i]]);
                stylesAndCounts = this._tallyStyles(
                    stylesAndCounts,
                    newStyleCounts
                );
            }

            // Sort the styles by count, descending.
            stylesAndCounts.sort((a, b) => b.count - a.count);

            allStylesAndCounts[type] = stylesAndCounts;
        }

        let allStylesAndCountsInfo: IStyleForMolType[] = Object.keys(
            allStylesAndCounts
        ).map((k: string) => {
            return {
                molType: k,
                style:
                    allStylesAndCounts[k].length > 0
                        ? allStylesAndCounts[k][0].style // First one is the most common.
                        : {}, // No styles for this type.
            } as IStyleForMolType;
        });

        return allStylesAndCountsInfo;
    }

    /**
     * Convert a list of styles to a list of style counts. Counts are all 1
     * because this serves to initialize the style count list.
     *
     * @param   {IStyle[]}  styles  The styles
     * @returns {IStyleCount[]}  The style counts
     */
    private _initStyleToStyleCount(styles: IStyle[]): IStyleCount[] {
        return styles.map((s: IStyle): IStyleCount => {
            return { style: s, count: 1 };
        });
    }

    /**
     * Tally the styles. Assuming stylesAndCounts and newStyleCounts don't contain
     * duplicates. It adds the counts where the styles are the same, and otherwise
     * merges the two counts lists.
     *
     * @param   {IStyleCount[]}  stylesAndCounts  The existing styles and counts.
     * @param   {IStyleCount[]}  newStyleCounts   The new styles and counts to
     *                                            add.
     * @returns {IStyleCount[]} The styles and counts after tallying.
     */
    private _tallyStyles(
        stylesAndCounts: IStyleCount[],
        newStyleCounts: IStyleCount[]
    ): IStyleCount[] {
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
<style scoped lang="scss"></style>
