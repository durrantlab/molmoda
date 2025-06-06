// ================== FILE: UI/Panels/Information/ProteinSequenceViewer.vue ==================
<template>
    <div class="protein-sequence-viewer" ref="sequenceContainer">
        <div v-if="sequence && sequence.length > 0" class="sequence-wrapper">
            <span v-for="(residue, index) in sequence" :key="`${residue.chain}-${residue.resi}-${index}`"
                class="residue"
                :style="{ backgroundColor: getResidueColor(residue.oneLetterCode), color: getResidueTextColor(residue.oneLetterCode) }"
                @mouseover="showTooltip(residue, $event)" @mouseleave="hideTooltip" @click="residueClicked(residue)">
                {{ residue.oneLetterCode }}
            </span>
        </div>
        <div v-else class="no-sequence-message">
            No protein sequence to display.
        </div>
        <Tooltip :tip="tooltipText" :placement="'top'" ref="tooltipVue" />
    </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import { ResidueInfo } from "./InformationPanelUtils";
import { getAminoAcidProperty } from "@/Core/Bioinformatics/AminoAcidUtils";
import Tooltip from "@/UI/MessageAlerts/Tooltip.vue";
import { selectProgramatically } from "@/UI/Navigation/TitleBar/MolSelecting";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import * as api from "@/Api";
import { makeEasyParser } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser";

@Options({
    components: {
        Tooltip,
    },
})
export default class ProteinSequenceViewer extends Vue {
    @Prop({ type: Array as () => ResidueInfo[], required: true })
    sequence!: ResidueInfo[];

    @Prop({ type: Object as () => TreeNode | undefined, default: undefined })
    treeNode?: TreeNode;


    tooltipText = "";
    tooltipVisible = false; // Not directly used to show/hide, Tooltip.vue handles it

    /**
     * Gets the background color for a residue based on its one-letter code.
     *
     * @param {string} oneLetterCode The one-letter code of the amino acid.
     * @returns {string} The hex color code.
     */
    getResidueColor(oneLetterCode: string): string {
        const prop = getAminoAcidProperty(oneLetterCode);
        return prop ? prop.color : '#FFFFFF'; // Default to white if not found
    }

    /**
     * Gets the text color for a residue, ensuring contrast with background.
     *
     * @param {string} oneLetterCode The one-letter code of the amino acid.
     * @returns {string} 'black' or 'white'.
     */
    getResidueTextColor(oneLetterCode: string): string {
        const bgColor = this.getResidueColor(oneLetterCode);
        // Simple brightness check for text color
        const hex = bgColor.replace('#', '');
        if (hex.length !== 6) return 'black'; // Fallback for invalid hex

        try {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return brightness > 125 ? 'black' : 'white';
        } catch (e) {
            return 'black'; // Fallback
        }
    }

    /**
     * Shows the tooltip with residue information.
     *
     * @param {ResidueInfo} residue The residue data.
     * @param {MouseEvent} event The mouse event.
     */
    showTooltip(residue: ResidueInfo, event: MouseEvent) {
        this.tooltipText = `${residue.threeLetterCode} ${residue.resi} (Chain ${residue.chain})`;
        const tooltipVue = this.$refs.tooltipVue as any;
        if (tooltipVue && tooltipVue.loadTip) {
            const span = event.currentTarget as HTMLElement;
            tooltipVue.$refs.tooltip = span;
            tooltipVue.loadTip();
        }
    }

    /**
     * Hides the tooltip.
     */
    hideTooltip() {
        this.tooltipText = "";
        const tooltipVue = this.$refs.tooltipVue as any;
        if (tooltipVue && tooltipVue.hideTip) {
            tooltipVue.hideTip();
        }
    }

    /**
     * Handles click on a residue.
     * Selects the corresponding residue in the 3D viewer.
     *
     * @param {ResidueInfo} residue The clicked residue.
     */
    async residueClicked(residue: ResidueInfo) {
        if (this.treeNode && this.treeNode.id && residue.atomIndex !== undefined) {
            const allMols = getMoleculesFromStore();
            const targetNode = allMols.filters.onlyId(this.treeNode.id);
            if (targetNode && targetNode.model) {
                const parser = makeEasyParser(targetNode.model);
                const atom = parser.getAtom(residue.atomIndex);
                if (atom && atom.x !== undefined && atom.y !== undefined && atom.z !== undefined) {
                    const viewer = await api.visualization.viewer;
                    // Prevent error if viewer is not ready or does not have centerOnPoint
                    if (viewer && typeof viewer.centerOnPoint === 'function') {
                        viewer.centerOnPoint(atom.x, atom.y, atom.z);
                    }
                    selectProgramatically(this.treeNode.id); // Select the parent protein node
                }
            }
        }
    }


    @Watch("sequence")
    onSequenceChanged() {
        // If the sequence changes, existing tooltips might be orphaned if not hidden.
        this.hideTooltip();
    }
}
</script>

<style scoped lang="scss">
.protein-sequence-viewer {
    font-family: monospace;
    line-height: 1.5;
    word-break: break-all;
    padding: 5px;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    max-height: 200px;
    /* Or use prop for maxHeight */
    overflow-y: auto;
    text-align: left;
    /* Ensure text aligns left */
}

.sequence-wrapper {
    display: flex;
    flex-wrap: wrap;
}

.residue {
    display: inline-block;
    min-width: 1.2em;
    /* Ensure a minimum width for very short text */
    padding-left: 0.1em;
    /* Add a little padding for aesthetics */
    padding-right: 0.1em;
    height: 1.2em;
    /* Adjust for desired height */
    text-align: center;
    line-height: 1.2em;
    /* Vertically center text */
    margin: 1px;
    border-radius: 3px;
    /* Slightly more rounded */
    cursor: default;
    user-select: none;
    font-weight: bold;
    box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.1);
    /* Subtle shadow for depth */
}

.residue:hover {
    outline: 1.5px solid #007bff;
    /* Bootstrap primary blue for hover */
    transform: scale(1.1);
    /* Slight zoom on hover */
    transition: transform 0.1s ease-out;
}

.no-sequence-message {
    text-align: center;
    color: #6c757d;
    padding: 10px;
}
</style>