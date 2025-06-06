<template>
    <div class="protein-sequence-viewer-container" ref="rootContainer">
        <div class="line-number-gutter" ref="lineNumberGutter">
            <!-- Line numbers will be dynamically inserted here -->
        </div>
        <div class="protein-sequence-scroll-area" ref="sequenceScrollArea">
            <div v-if="sequence && sequence.length > 0" class="sequence-wrapper" ref="sequenceWrapper">
                <span v-for="(residue, index) in sequence" :key="`${residue.chain}-${residue.resi}-${index}`"
                    :class="['residue', `residue-chain-${residue.chain.replace(/[^a-zA-Z0-9]/g, '')}`]"
                    :style="{ backgroundColor: getResidueColor(residue.oneLetterCode), color: getResidueTextColor(residue.oneLetterCode) }"
                    @click="residueClicked(residue)"
                    :title="`${residue.threeLetterCode} ${residue.resi} (Chain ${residue.chain})`"
                data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    :data-residue-key="`${residue.chain}-${residue.resi}`"> 
                    {{ residue.oneLetterCode }}
                </span>
        </div>
            <div v-else class="no-sequence-message">
            Protein sequence is empty.
        </div>
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

    /**
     * Initialize tooltips for all residue elements
     */
    async initializeTooltips() {
        try {
            const BSToolTip = await dynamicImports.bootstrapTooltip.module;
            const residueElements = this.$el.querySelectorAll('.residue[data-bs-toggle="tooltip"]');
            
            // Clean up existing tooltips
            this.disposeTooltips();
            
            // Create new tooltip instances
            residueElements.forEach((element) => {
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
            if (tooltip && tooltip.dispose) {
                tooltip.dispose();
            }
        });
        this.tooltipInstances = [];
    }

    /**
     * Calculates and renders line numbers in the gutter.
     */
    async updateLineNumbers() {
        if (!this.sequence || this.sequence.length === 0) {
            this.clearLineNumberGutter();
            return;
        }

        await this.$nextTick(); 

        const sequenceWrapper = this.$refs.sequenceWrapper as HTMLElement;
        const lineNumberGutter = this.$refs.lineNumberGutter as HTMLElement;
        const sequenceScrollArea = this.$refs.sequenceScrollArea as HTMLElement; // Get the scrollable container
        
        if (!sequenceWrapper || !lineNumberGutter || !sequenceScrollArea) return;

        this.clearLineNumberGutter();

        const residueElements = Array.from(sequenceWrapper.children) as HTMLElement[];
        let lastOffsetTopInScrollArea = -1; // Track offsetTop relative to the scroll area
        let currentChain = ""; 
        const gutterRect = lineNumberGutter.getBoundingClientRect();
        const scrollAreaRect = sequenceScrollArea.getBoundingClientRect();


        residueElements.forEach((element, index) => {
            if (index < this.sequence.length) { 
                const residue = this.sequence[index];
                const elementRect = element.getBoundingClientRect();
                
                // Calculate offsetTop relative to the scrollArea, accounting for current scroll position
                const currentOffsetTopInScrollArea = elementRect.top - scrollAreaRect.top + sequenceScrollArea.scrollTop;

                if (currentOffsetTopInScrollArea > lastOffsetTopInScrollArea || (currentChain !== residue.chain && lastOffsetTopInScrollArea !== -1) ) {
                    if (index > 0 || (currentChain !== residue.chain && this.sequence.length > 0) || (this.sequence.length > 0 && currentChain === "" && residue.chain !== "") ) {
                        // Ensure we don't add a number for the very first residue if it's the same chain,
                        // but do add if the chain changes or it's the start of a new chain segment.
                        if (currentChain === "" && index === 0 && this.sequence.length > 0) currentChain = residue.chain; // Initialize currentChain for the first element

                        if(index === 0 || currentOffsetTopInScrollArea > lastOffsetTopInScrollArea || currentChain !== residue.chain) {
                    const numberSpan = document.createElement('span');
                    numberSpan.className = 'line-number';
                    numberSpan.textContent = residue.resi.toString();
                            
                            // Position relative to the gutter
                            // The `top` should be the residue's top relative to the scrollable area's top,
                            // minus the gutter's own top relative to its offset parent (if different).
                            // Simpler: residue's top relative to viewport minus gutter's top relative to viewport.
                            // This aligns the number with the residue start *within the visible part of the gutter*.
                            const topPosition = elementRect.top - gutterRect.top;
                            numberSpan.style.top = `${topPosition}px`;
                   
                    lineNumberGutter.appendChild(numberSpan);
                        }
                    }
                    lastOffsetTopInScrollArea = currentOffsetTopInScrollArea;
                }
                currentChain = residue.chain; 
                }
        });
    }

    /**
     * Clears all dynamically added line numbers from the gutter.
     */
    clearLineNumberGutter() {
        const lineNumberGutter = this.$refs.lineNumberGutter as HTMLElement;
        if (lineNumberGutter) {
            lineNumberGutter.innerHTML = ''; // Clear previous numbers
        }
    }

    setupResizeObserver() {
        const container = this.$refs.rootContainer as HTMLElement; 
        if (container && !this.resizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                // Debounce or throttle this if it fires too often
                this.updateLineNumbers();
            });
            this.resizeObserver.observe(container);
        }
    }

    @Watch("sequence", { immediate: true, deep: true })
    async onSequenceChanged() {
        // When sequence changes, re-calculate line numbers and re-init tooltips
        this.updateLineNumbers();
        await this.$nextTick();
        this.initializeTooltips();
    }

    async mounted() {
        // Initialize tooltips after component is mounted
        await this.$nextTick();
        this.setupResizeObserver();
        this.updateLineNumbers(); // Initial calculation
        this.initializeTooltips();
    }

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
  display: flex; 
  position: relative; 
  font-family: 'Menlo', 'Monaco', 'Consolas', "Courier New", monospace; 
  line-height: 1.2; 
  background-color: #f8f9fa; 
  border: 1px solid #e0e0e0; 
  border-radius: 2px; 
  width: 100%; 
  box-sizing: border-box;
  max-height: 150px; 
  /* IMPORTANT: The container itself should not scroll, the inner .protein-sequence-scroll-area will */
  overflow: hidden; 
}

.line-number-gutter {
  flex-shrink: 0; 
  width: 35px; 
  padding-right: 5px; 
  box-sizing: border-box;
  position: relative; 
  // border-right: 1px solid #ddd; 
  /* Gutter is full height of its container, but content might scroll */
  /* It does not scroll itself; its numbers are absolutely positioned relative to it */
}

.protein-sequence-scroll-area {
  flex-grow: 1; 
  overflow-y: auto; 
  padding: 2px; 
  text-align: left; 
  word-break: break-all; 
  box-sizing: border-box;
  /* height: 100%; // Removed, as max-height is on parent */
}

.sequence-wrapper {
  display: flex; 
    flex-wrap: wrap;
  align-items: flex-start; 
}

.residue {
  display: inline-flex; 
  align-items: center;  
  justify-content: center; 
  padding: 0.05em 0.15em; 
  min-width: 0.8em;    
  height: 1.2em;         
  font-size: 0.95em; 
    text-align: center;
  margin: 0; 
  border-radius: 0; 
  cursor: default; 
  user-select: none; 
  font-weight: normal; 
}

:deep(.line-number) { 
  display: block; 
  position: absolute; 
  left: 2px; 
  font-size: 0.75em;  
  color: #6c757d;      
  height: 1.2em;    
  line-height: 1.2em;   
  user-select: none; 
  font-weight: normal; 
  text-align: right; 
  width: calc(100% - 7px); 
  box-sizing: border-box;
}


.no-sequence-message {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 50px; // Ensure it has some height
    text-align: center;
  color: #6c757d; 
  padding: 8px; 
  font-size: 0.9em;
}
</style>