<template>
    <div ref="mol2dViewContainer" class="mol2d-view-container" :style="containerStyle" v-html="svgContent"></div>
</template>

<script lang="ts">
import { dynamicImports } from "@/Core/DynamicImports";
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import { messagesApi } from "@/Api/Messages";

/**
 * Mol2DView component for displaying a 2D molecular structure from a SMILES string using RDKit.js.
 */
@Options({})
export default class Mol2DView extends Vue {
    /**
     * The SMILES string to render.
     * 
     * @type {string}
     * @required
     */
    @Prop({ required: true }) smiles!: string;

    /**
     * Optional explicit width for the SVG drawing.
     * If not provided, the SVG will try to fit its container.
     * 
     * @type {number | undefined}
     */
    @Prop({ default: undefined }) drawingWidth!: number | undefined;

    /**
     * Optional explicit height for the SVG drawing.
     * If not provided, the SVG will try to fit its container.
     * 
     * @type {number | undefined}
     */
    @Prop({ default: undefined }) drawingHeight!: number | undefined;

    /**
     * Optional maximum height for the container.
     * The SVG will scale down to fit if its natural height exceeds this.
     * 
     * @type {number | undefined}
     */
    @Prop({ default: undefined }) maxHeight!: number | undefined;

    /**
     * Optional minimum height for the container.
     * 
     * @type {number}
     * @default 30 (for error messages)
     */
    @Prop({ default: 30 }) minHeight!: number;


    // Private reactive properties
    private rdkitModule: any = null;
    private svgContent = "";
    private internalContainerHeight = 0;
    private internalContainerWidth = 0;
    private resizeObserver: ResizeObserver | null = null;


    /**
     * Computed style for the container div.
     * 
     * @returns {string} The style string.
     */
    get containerStyle(): string {
        let height = this.internalContainerHeight;
        if (this.maxHeight !== undefined && height > this.maxHeight) {
            height = this.maxHeight;
        }
        if (height < this.minHeight) {
            height = this.minHeight;
        }

        // Container always tries to fill parent width
        return `width: '100%'; height: ${height}px; display: flex; justifyContent: center; alignItems: center; overflow: hidden;`
    }

    /**
     * Watcher for the SMILES prop. Redraws the molecule if SMILES changes.
     */
    @Watch("smiles")
    onSmilesChanged() {
        this.renderMolecule();
    }

    /**
     * Watcher for drawingWidth, drawingHeight, or maxHeight. Redraws if they change.
     */
    @Watch("drawingWidth")
    @Watch("drawingHeight")
    @Watch("maxHeight")
    onDimensionPropsChanged() {
        this.renderMolecule();
    }

    /**
     * Lifecycle hook called when the component is mounted.
     * Initializes RDKit and sets up resize observation.
     */
    async mounted() {
        try {
            this.rdkitModule = await dynamicImports.rdkitjs.module;
        } catch (error: any) {
            console.error("Error loading RDKit module in Mol2DView:", error);
            this.svgContent = `<p style="color:red; text-align:center; font-size: small;">Error loading drawing library.</p>`;
            this.internalContainerHeight = this.minHeight;
            messagesApi.popupError("Failed to load 2D drawing library. Molecule previews may not be available.");
            return;
        }
        this.setupResizeObserver();
        // Initial render attempt after module loaded and container measured
        this.$nextTick(() => {
            this.updateInternalContainerWidth(); // First measure
            this.renderMolecule();
        });
    }

    /**
     * Lifecycle hook called before the component is unmounted.
     * Cleans up the resize observer.
     */
    beforeUnmount() {
        if (this.resizeObserver) {
            const container = this.$refs.mol2dViewContainer as HTMLElement;
            if (container) {
                this.resizeObserver.unobserve(container);
            }
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    /**
     * Sets up a ResizeObserver to react to container width changes.
     */
    setupResizeObserver() {
        const container = this.$refs.mol2dViewContainer as HTMLElement;
        if (container) {
            this.resizeObserver = new ResizeObserver(entries => {
                if (entries && entries.length > 0) {
                    const newWidth = entries[0].contentRect.width;
                    if (this.internalContainerWidth !== newWidth) {
                        this.internalContainerWidth = newWidth;
                        this.renderMolecule();
                    }
                }
            });
            this.resizeObserver.observe(container);
        }
    }

    /**
     * Updates the internal container width based on the DOM element.
     */
    updateInternalContainerWidth() {
        const container = this.$refs.mol2dViewContainer as HTMLElement;
        if (container) {
            this.internalContainerWidth = container.offsetWidth;
        }
    }

    /**
     * Renders the molecule as an SVG using RDKit.js.
     */
    async renderMolecule() {
        if (!this.rdkitModule || !this.smiles || this.internalContainerWidth === 0) {
            this.svgContent = "";
            this.internalContainerHeight = 0;
            return;
        }

        try {
            const mol = this.rdkitModule.get_mol(this.smiles);
            if (!mol) {
                this.svgContent = `<p style="color:red; text-align:center; font-size: small;">Invalid SMILES</p>`;
                this.internalContainerHeight = this.minHeight;
                return;
            }

            const rdkitDrawingWidth = this.drawingWidth !== undefined ? this.drawingWidth : this.internalContainerWidth;
            let rdkitDrawingHeight = this.drawingHeight;

            if (rdkitDrawingHeight === undefined) {
                // If drawingHeight is not provided, calculate it based on aspect ratio
                // To do this, we first generate a temporary SVG to get its intrinsic dimensions
                const tempSvgOptions = { width: rdkitDrawingWidth, kekulize: true };
                const tempRawSvg = mol.get_svg_with_highlights(JSON.stringify(tempSvgOptions));
                const tempParser = new DOMParser();
                const tempSvgDoc = tempParser.parseFromString(tempRawSvg, "image/svg+xml");
                const tempSvgRoot = tempSvgDoc.documentElement;
                const tempW = parseFloat(tempSvgRoot.getAttribute("width") || `${rdkitDrawingWidth}`);
                const tempH = parseFloat(tempSvgRoot.getAttribute("height") || `${rdkitDrawingWidth}`);
                const aspectRatio = (tempH && tempW) ? tempH / tempW : 1;
                rdkitDrawingHeight = rdkitDrawingWidth * aspectRatio;
            }

            // Final SVG options
            const svgOptions = {
                width: Math.floor(rdkitDrawingWidth),
                height: Math.floor(rdkitDrawingHeight),
                kekulize: true,
            };
            this.svgContent = mol.get_svg_with_highlights(JSON.stringify(svgOptions));
            mol.delete(); // IMPORTANT: free RDKit memory

            // Set container height based on the generated SVG's height, respecting maxHeight
            this.internalContainerHeight = Math.floor(rdkitDrawingHeight);

        } catch (error: any) {
            console.error("Error rendering molecule in Mol2DView:", error);
            this.svgContent = `<p style="color:red; text-align:center; font-size: small;">Render Error</p>`;
            this.internalContainerHeight = this.minHeight;
        }
    }
}
</script>

<style scoped lang="scss">
.mol2d-view-container> ::v-deep(svg) {
    max-width: 100%;
    max-height: 100%;
    display: block;
}
</style>