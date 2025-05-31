<template>
    <div ref="mol2dViewContainer" class="mol2d-view-container" :style="containerStyle">
        <div class="svg-render-area" v-html="svgContent"></div>
        <div v-if="showDownloadButtons && svgContent && svgContent.includes('<svg')"
            class="download-buttons-container mt-2">
            <button @click="downloadSvgMethod" class="badge rounded-pill btn btn-sm btn-primary me-2">Download SVG</button>
            <button @click="downloadPngMethod" class="badge rounded-pill btn btn-sm btn-primary me-2">Download PNG</button>
            <button @click="copyImageMethod" class="badge rounded-pill btn btn-sm btn-primary">Copy Image</button>
        </div>
    </div>
</template>

<script lang="ts">
import { dynamicImports } from "@/Core/DynamicImports";
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import { messagesApi } from "@/Api/Messages";
import { fsApi } from "@/Api/FS";
import { FileInfo } from "@/FileSystem/FileInfo";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";

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

    /**
     * If true, displays download and copy buttons.
     * 
     * @type {boolean}
     * @default false
     */
    @Prop({ default: false }) showDownloadButtons!: boolean;


    // Private reactive properties
    private rdkitModule: any = null;
    private svgContent = "";
    private internalContainerHeight = 0;
    private internalContainerWidth = 0;
    private resizeObserver: ResizeObserver | null = null;
    private lastValidSvgWidth = 0;
    private lastValidSvgHeight = 0;


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
        let cssStr = `width: 100%; height: ${height}px; display: flex; flex-direction: column; justifyContent: center; alignItems: center; overflow: hidden;`
        if (this.showDownloadButtons) {
            cssStr += ` padding-bottom: 5px;`; // Add some padding if buttons are shown
        }
        return cssStr;
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
            this.lastValidSvgWidth = 0;
            this.lastValidSvgHeight = 0;
            return;
        }

        try {
            const mol = this.rdkitModule.get_mol(this.smiles);
            if (!mol) {
                this.svgContent = `<p style="color:red; text-align:center; font-size: small;">Invalid SMILES</p>`;
                this.internalContainerHeight = this.minHeight;
                this.lastValidSvgWidth = 0;
                this.lastValidSvgHeight = 0;
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

            this.lastValidSvgWidth = Math.floor(rdkitDrawingWidth);
            this.lastValidSvgHeight = Math.floor(rdkitDrawingHeight);

            // Final SVG options
            const svgOptions = {
                width: this.lastValidSvgWidth,
                height: this.lastValidSvgHeight,
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
            this.lastValidSvgWidth = 0;
            this.lastValidSvgHeight = 0;
        }
    }

    /**
     * Downloads the current 2D molecule rendering as an SVG file.
     */
    downloadSvgMethod() {
        if (!this.svgContent || !this.svgContent.includes("<svg")) {
            messagesApi.popupError("No valid SVG content to download.");
            return;
        }
        const fileInfo = new FileInfo({
            name: "molecule_2d.svg", // saveSvg will ensure .svg extension
            contents: this.svgContent,
        });
        fsApi.saveSvg(fileInfo); // Use the new saveSvg method
    }

    /**
     * Helper function to get canvas from current SVG.
     * 
     * @param {number} targetWidth The target width for the canvas.
     * @returns {Promise<HTMLCanvasElement | null>} A promise that resolves with the canvas or null.
     */
    private async getCanvasFromSvg(targetWidth: number): Promise<HTMLCanvasElement | null> {
        if (!this.svgContent || !this.svgContent.includes("<svg")) {
            return null;
        }

        const svgContainer = this.$refs.mol2dViewContainer as HTMLElement;
        const svgElement = svgContainer.querySelector(".svg-render-area svg");

        if (!svgElement) return null;

        return new Promise((resolve) => {
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const img = new Image();
            img.onload = () => {
                const originalWidth = this.lastValidSvgWidth || img.width;
                const originalHeight = this.lastValidSvgHeight || img.height;
                const aspectRatio = originalHeight / originalWidth;
                const targetHeight = Math.round(targetWidth * aspectRatio);

                const canvas = document.createElement("canvas");
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    resolve(null);
                    return;
                }
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                resolve(canvas);
            };
            img.onerror = () => {
                resolve(null);
            }
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
        });
    }


    /**
     * Downloads the current 2D molecule rendering as a PNG file.
     */
    async downloadPngMethod() {
        const canvas = await this.getCanvasFromSvg(1024); // Target width 1024px for PNG
        if (!canvas) {
            messagesApi.popupError("Failed to generate PNG from SVG.");
            return;
        }

        canvas.toBlob((blob) => {
            if (!blob) {
                messagesApi.popupError("Failed to create PNG blob.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUri = reader.result as string;
                fsApi.savePngUri("molecule_2d.png", dataUri);
            };
            reader.onerror = () => {
                messagesApi.popupError("Failed to read PNG blob as data URL.");
            }
            reader.readAsDataURL(blob);
        }, "image/png");
    }

    /**
     * Copies the current 2D molecule rendering to the clipboard as a PNG image.
     */
    async copyImageMethod() {
        const canvas = await this.getCanvasFromSvg(this.lastValidSvgWidth || 512); // Use current SVG width or fallback
        if (!canvas) {
            messagesApi.popupError("Failed to generate image for clipboard.");
            return;
        }

        if (navigator.clipboard && navigator.clipboard.write) {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    messagesApi.popupError("Failed to create image blob for clipboard.");
                    return;
                }
                try {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore - ClipboardItem is standard but TS might complain without full DOM lib
                    const clipboardItem = new window.ClipboardItem({ 'image/png': blob });
                    await navigator.clipboard.write([clipboardItem]);
                    messagesApi.popupMessage("Success", "Image copied to clipboard!", PopupVariant.Success);
                } catch (error: any) {
                    console.error("Failed to copy image to clipboard:", error);
                    messagesApi.popupError(`Failed to copy image: ${error.message}`);
                }
            }, "image/png");
        } else {
            messagesApi.popupError("Clipboard API not available or not permitted in this browser.");
        }
    }
}
</script>

<style scoped lang="scss">
.mol2d-view-container {
    display: flex;
    flex-direction: column;
    /* Stack SVG and buttons vertically */
    justify-content: center;
    align-items: center;
    width: 100%;
}

.svg-render-area {
    width: 100%;
    /* SVG area takes full width of its parent */
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    /* Ensure SVG does not overflow its designated area */
}

.svg-render-area> ::v-deep(svg) {
    max-width: 100%;
    max-height: 100%;
    display: block;
}

.download-buttons-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 8px;
    /* Add some space above the buttons */
}
</style>