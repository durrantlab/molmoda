<template>
    <div class="protein-sequence-viewer-container" ref="rootContainer">

        <div v-if="processedSequenceLines && processedSequenceLines.length > 0" class="sequence-area">
            <div v-for="(line, lineIndex) in processedSequenceLines"
                :key="`line-${line.chain}-${line.lineNumber}-${lineIndex}`" class="sequence-line">
                <span class="line-number">
                    {{ line.lineNumberFormatted }}
                </span>
                <div class="residues-on-line">
                    <span v-for="(residue, resIndex) in line.residues"
                        :key="`res-${residue.chain}-${residue.resi}-${resIndex}`"
                        :class="['residue', `residue-chain-${residue.chain.replace(/[^a-zA-Z0-9]/g, '')}`]"
                        :style="{ backgroundColor: getResidueColor(residue.oneLetterCode), color: getResidueTextColor(residue.oneLetterCode) }"
                        @click="residueClicked(residue)" :title="`${residue.threeLetterCode} ${residue.resi}`"
                        data-bs-toggle="tooltip" data-bs-placement="top">
                        {{ residue.oneLetterCode }}
                    </span>
                </div>
            </div>
        </div>
        <div v-else-if="sequence && sequence.length === 0" class="no-sequence-message">
            Protein sequence is empty.
        </div>
        <div v-else class="no-sequence-message">
            No protein sequence to display.
        </div>
    </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import { ResidueInfo } from "./InformationPanelUtils";
import { getAminoAcidProperty } from "@/Core/Bioinformatics/AminoAcidUtils";
import { selectProgramatically } from "@/UI/Navigation/TitleBar/MolSelecting";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import * as api from "@/Api";
import { makeEasyParser } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser";
import { dynamicImports } from "@/Core/DynamicImports";

// --- Configuration Constants ---
const LABEL_WIDTH = 40;  // Width of line number labels in pixels
const AMINO_ACID_WIDTH = 15;

interface ProcessedLine {
    lineNumber: number;
    lineNumberFormatted: string;
    chain: string;
    residues: ResidueInfo[];
}

/**
 * ProteinSequenceViewer component displays a protein sequence with residues
 * color-coded and clickable to select in a 3D viewer.
 */
@Options({
    components: {},
})
export default class ProteinSequenceViewer extends Vue {
    @Prop({ type: Array as () => ResidueInfo[], required: true })
    sequence!: ResidueInfo[];

    @Prop({ type: Object as () => TreeNode | undefined, default: undefined })
    treeNode?: TreeNode;

    private tooltipInstances: any[] = [];
    private resizeObserver: ResizeObserver | null = null;

    processedSequenceLines: ProcessedLine[] = [];
    private currentRootContainerWidthPx = 0;

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
     * Updates the line number column width dynamically
     * 
     * @param {number} widthPx The new width in pixels
     */
    updateLineNumberWidth(widthPx: number) {
        const container = this.$refs.rootContainer as HTMLElement;
        if (container) {
            container.style.setProperty('--line-number-width', `${widthPx}px`);
            // Recalculate lines since the available width has changed
            this.calculateLines();
        }
    }

    /**
     * Handles click on a residue.
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

    /**
     * Initialize tooltips for all residue elements
     */
    async initializeTooltips() {
        try {
            const BSToolTip = await dynamicImports.bootstrapTooltip.module;
            // Correctly query for HTMLElements and iterate
            const residueElements = this.$el.querySelectorAll('.residue[data-bs-toggle="tooltip"]') as [HTMLElement];

            this.disposeTooltips(); // Clean up existing tooltips

            residueElements.forEach((element) => { // Iterate over the NodeList
                const tooltip = new BSToolTip(element);
                this.tooltipInstances.push(tooltip);
            });
        } catch (error) {
            console.error('Failed to initialize tooltips:', error);
        }
    }

    /**
     * Dispose of all tooltip instances
     */
    disposeTooltips() {
        this.tooltipInstances.forEach(tooltip => {
            if (tooltip && typeof tooltip.dispose === 'function') {
                tooltip.dispose();
            }
        });
        this.tooltipInstances = [];
    }

    /**
     * Calculates how many residues fit per line and structures the sequence into lines.
     */
    async calculateLines() {
        if (!this.sequence || this.sequence.length === 0 || this.currentRootContainerWidthPx === 0) {
            this.processedSequenceLines = [];
            return;
        }

        // await new Promise(resolve => setTimeout(resolve, 500));

        // Calculate total space taken by the label column
        const totalLabelWidthPx = LABEL_WIDTH; //  + labelPaddingPx;

        // Calculate available width for residues
        const availableWidthForResidues = this.currentRootContainerWidthPx - totalLabelWidthPx; // - containerPaddingPx - scrollbarWidthPx - safetyMarginPx;

        let residuesPerLine = Math.floor(availableWidthForResidues / AMINO_ACID_WIDTH);
        if (residuesPerLine <= 0) {
            residuesPerLine = 1; // Ensure at least one residue per line to avoid infinite loops
        }

        const newProcessedLines: ProcessedLine[] = [];
        if (this.sequence.length === 0) {
            this.processedSequenceLines = newProcessedLines;
            return;
        }

        // Find the maximum residue number to determine padding width
        const maxResi = Math.max(...this.sequence.map(r => r.resi));
        const padWidth = maxResi.toString().length;

        let currentLineResidues: ResidueInfo[] = [];
        let firstResidueOfLine = this.sequence[0];
        let currentChain = this.sequence[0].chain;

        for (let i = 0; i < this.sequence.length; i++) {
            const residue = this.sequence[i];

            if (currentLineResidues.length === 0) {
                firstResidueOfLine = residue;
            }

            // Start a new line if max residues reached OR if chain changes
            if (currentLineResidues.length >= residuesPerLine || (residue.chain !== currentChain && currentLineResidues.length > 0)) {
                if (currentLineResidues.length > 0) {
                    newProcessedLines.push({
                        lineNumber: firstResidueOfLine.resi,
                        lineNumberFormatted: firstResidueOfLine.resi.toString().padStart(padWidth, ' '),
                        chain: firstResidueOfLine.chain,
                        residues: currentLineResidues
                    });
                }
                currentLineResidues = [];
                firstResidueOfLine = residue;
            }
            currentChain = residue.chain;
            currentLineResidues.push(residue);
        }

        // Add any remaining residues from the last line
        if (currentLineResidues.length > 0) {
            newProcessedLines.push({
                lineNumber: firstResidueOfLine.resi,
                lineNumberFormatted: firstResidueOfLine.resi.toString().padStart(padWidth, ' '),
                chain: firstResidueOfLine.chain,
                residues: currentLineResidues
            });
        }

        this.processedSequenceLines = newProcessedLines;

        await this.$nextTick();
        this.initializeTooltips();
    }

    /**
     * Sets up a ResizeObserver to handle changes in the size of the root container.
     */
    setupResizeObserver() {
        const container = this.$refs.rootContainer as HTMLElement;
        if (container && !this.resizeObserver) {
            this.currentRootContainerWidthPx = container.offsetWidth; // Initial width
            this.resizeObserver = new ResizeObserver((entries) => {
                if (entries && entries.length > 0) {
                    const newWidth = entries[0].contentRect.width;
                    if (this.currentRootContainerWidthPx !== newWidth) {
                        this.currentRootContainerWidthPx = newWidth;
                        this.calculateLines();
                    }
                }
            });
            this.resizeObserver.observe(container);
        }
    }

    /**
     * Watches for changes in the sequence prop and updates line numbers
     * accordingly. This is triggered when the sequence data changes.
     */
    @Watch("sequence", { immediate: true, deep: true })
    async onSequenceChanged() {
        this.calculateLines();
    }

    /**
     * Lifecycle hook called when the component is mounted. Initializes tooltips
     * and sets up resize observer.
     */
    async mounted() {
        await this.$nextTick();

        // Apply the label width from JavaScript constant to CSS
        const style = document.createElement('style');
        style.textContent = `
            .protein-sequence-viewer-container .line-number {
                width: ${LABEL_WIDTH}px !important;
                min-width: ${LABEL_WIDTH}px !important;
                max-width: ${LABEL_WIDTH}px !important;
            }
            .residue {
                width: ${AMINO_ACID_WIDTH}px !important;
                min-width: ${AMINO_ACID_WIDTH}px !important;
                max-width: ${AMINO_ACID_WIDTH}px !important;
            }
        `;
        document.head.appendChild(style);

        this.setupResizeObserver();
        // calculateLines will be called by ResizeObserver's initial call or sequence watcher
        this.initializeTooltips();
    }

    /**
     * Lifecycle hook called before the component is unmounted. Cleans up
     * tooltips and resize observer to prevent memory leaks.
     */
    beforeUnmount() {
        // Clean up tooltips before component is destroyed
        this.disposeTooltips();
        if (this.resizeObserver) {
            const container = this.$refs.rootContainer as HTMLElement;
            if (container) this.resizeObserver.unobserve(container);
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }
}
</script>

<style scoped lang="scss">
.protein-sequence-viewer-container {
    font-family: 'Menlo', 'Monaco', 'Consolas', "Courier New", monospace;
    line-height: 1.2;
    background-color: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 2px;
    width: 100%;
    box-sizing: border-box;
    // max-height: 150px;
    overflow-y: auto;
    padding: 2px;
}

.sequence-line {
    display: flex;
    align-items: flex-start;
    margin-bottom: 1px;
    min-height: 1.2em;
}

.line-number {
    flex-shrink: 0;
    font-size: 0.75em;
    color: #555;
    padding-right: 0.5em;
    text-align: right;
    height: 1.2em;
    line-height: 1.35em;
    user-select: none;
    font-weight: normal;
    box-sizing: border-box;
    white-space: nowrap;
    overflow: hidden;
    font-family: 'Menlo', 'Monaco', 'Consolas', "Courier New", monospace;
    font-variant-numeric: tabular-nums;
}

.residues-on-line {
    display: flex;
    flex-wrap: nowrap;
    flex-grow: 1;
}

.residue {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.1em 0.15em;
    height: 1.2em;
    font-size: 0.95em;
    text-align: center;
    margin: 0;
    border-radius: 0;
    cursor: default;
    user-select: none;
    font-weight: normal;
    box-sizing: border-box;
}

.no-sequence-message {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    min-height: 50px;
    text-align: center;
    color: #6c757d;
    padding: 8px;
    font-size: 0.9em;
}
</style>