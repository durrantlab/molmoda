<template>
    <div ref="smiles-container" class="mb-4" :style="containerStyles">
        <!-- THIS GOOD IF IN VIEWER: class="mb-2 ms-2" -->
        <svg @click="onClick" :style="svgStyles" :id="id" ref="output-svg" viewBox="0 0 0 0"
            xmlns="http://www.w3.org/2000/svg" v-html="embeddedSvgContent"></svg>
        <Popup v-if="!inPopup" v-model="showSmilesPopup" title="Molecular Structure" cancelBtnTxt="Close"
            id="molStructure">
            <!-- For the popup, we'll also use RDKit to generate SVG, displayed in a simple div -->
            <div v-if="showSmilesPopup" class="popup-svg-container" v-html="popupSvgContent"></div>
        </Popup>
    </div>
</template>

<script lang="ts">
import { dynamicImports } from "@/Core/DynamicImports";
import { randomID } from "@/Core/Utils/MiscUtils";
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import Popup from "../Layout/Popups/Popup.vue";

/**
 * Viewer2D component (originally named Viewer3D.vue but functions as a 2D SMILES SVG viewer)
 */
@Options({
    components: {
        Popup
    },
})
export default class Viewer2D extends Vue {
    @Prop({ default: "" }) smiles!: string;
    // @Prop({ defaut: false }) getSmilesFromSelected!: boolean;
    @Prop({ default: "100%" }) width!: string;
    @Prop({ default: undefined }) maxHeight!: number | undefined;
    // Should not specify height
    @Prop({ default: "" }) extraStyles!: string;
    @Prop({ default: false }) inPopup!: boolean;

    private smilesContainer: HTMLDivElement | undefined = undefined;
    private interval: any = undefined;
    private id = "viewer2d-smiles-svg-" + randomID();
    private rdkitModule: any = null;

    // Reactive properties
    private measuredContainerWidth = 0;
    private containerHeight = 0;
    private svgScaleFactor = 1; // Will be used to adjust viewBox effectively
    private showSmilesPopup = false;
    private embeddedSvgContent = ""; // For the main display
    private popupSvgContent = ""; // For the popup display

    /**
     * Watcher for the smiles prop. Draws the molecule if smiles changes.
     */
    @Watch("smilesToUse")
    onSmilesToUse() {
        this.draw();
    }

    /**
     * Watcher for the width prop. Draws the molecule if width changes.
     */
    @Watch("measuredContainerWidth") // Changed from containerWidth to measuredContainerWidth
    onContainerWidth() {
        this.draw();
    }

    /**
     * Gets the css styles for the container div.
     * @returns {string} The css styles.
     */
    get containerStyles(): string {
        const width = this.smilesToUse === "" ? "0" : this.width;
        // Height is now controlled by the SVG's viewBox and the container's aspect ratio
        return `width:${width}; height:${this.containerHeight}px; ${this.extraStyles}; display: flex; align-items: center; justify-content: center;`;
    }

    /**
     * Gets the css styles for the svg.
     * @returns {string} The css styles.
     */
    get svgStyles(): string {
        const heightStyle = this.smilesToUse === "" || this.embeddedSvgContent === "" ? "height: 0;" : "height: 100%;"; // SVG fills container
        const widthStyle = "width: 100%;"; // SVG fills container
        return `${heightStyle} ${widthStyle} margin: auto; display: block; cursor: pointer;`;
    }

    /**
     * Whether component is ready.
     * @returns {boolean} Whether the RDKit library is loaded and ready to use.
     */
    get readyToUse(): boolean {
        if (this.smilesToUse === "") {
            return false;
        }
        return !!(this.rdkitModule && this.smilesContainer);
    }

    /**
     * The smiles to use.
     * @returns {string} The smiles to use.
     */
    get smilesToUse(): string {
        return this.smiles.replace(/\t/g, " ").split(" ")[0].trim();
    }

    /**
     * Runs when the user clicks the SVG image. Opens the bigger popup with the SVG.
     */
    onClick() {
        if (!this.inPopup) {
            this.generatePopupSvg();
            this.showSmilesPopup = true;
        }
    }

    /**
     * Generates SVG for the popup.
     */
    private async generatePopupSvg() {
        if (!this.rdkitModule || !this.smilesToUse) {
            this.popupSvgContent = "";
            return;
        }
        try {
            const mol = this.rdkitModule.get_mol(this.smilesToUse);
            if (mol) {
                // For popup, let's use a fixed larger size or make it responsive within popup
                const svgOptions = { width: 400, height: 300, kekulize: true };
                this.popupSvgContent = mol.get_svg_with_highlights(JSON.stringify(svgOptions));
                mol.delete();
            } else {
                this.popupSvgContent = `<p style="color:red;">Invalid SMILES for popup.</p>`;
            }
        } catch (e: any) {
            console.error("Error generating popup SVG:", e);
            this.popupSvgContent = `<p style="color:red;">Error generating popup SVG.</p>`;
        }
    }


    /**
     * Draws the molecule.
     */
    async draw() {
        if (!this.readyToUse || this.measuredContainerWidth === 0) {
            this.embeddedSvgContent = "";
            this.containerHeight = 0;
            return;
        }

        const svgElement = this.$refs["output-svg"] as SVGElement;
        if (!svgElement) return;

        try {
            const mol = this.rdkitModule.get_mol(this.smilesToUse);
            if (!mol) {
                this.embeddedSvgContent = `<text x="50%" y="50%" fill="red" text-anchor="middle" dy=".3em">Invalid SMILES</text>`;
                // Set a small fixed height for the error message to be visible
                this.containerHeight = this.maxHeight !== undefined ? Math.min(30, this.maxHeight) : 30;
                svgElement.setAttribute("viewBox", `0 0 ${this.measuredContainerWidth} ${this.containerHeight}`);
                return;
            }

            // Generate SVG with dimensions based on container width
            // Let RDKit determine height based on its internal aspect ratio for the given width
            const svgOptions = {
                width: Math.floor(this.measuredContainerWidth),
                // height: undefined, // Let RDKit decide height based on molecule and width
                kekulize: true,
                // theme: this.theme, // RDKit might have its own theming options if needed
            };
            const rawSvg = mol.get_svg_with_highlights(JSON.stringify(svgOptions));
            mol.delete();

            // Parse the raw SVG to extract its actual dimensions (RDKit includes width/height attributes)
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(rawSvg, "image/svg+xml");
            const svgRoot = svgDoc.documentElement;

            let svgWidth = this.measuredContainerWidth;
            let svgHeight = this.measuredContainerWidth; // Default to square if not found

            const wAttr = svgRoot.getAttribute("width");
            const hAttr = svgRoot.getAttribute("height");

            if (wAttr) svgWidth = parseFloat(wAttr.replace("px", ""));
            if (hAttr) svgHeight = parseFloat(hAttr.replace("px", ""));

            // Calculate aspect ratio and set container height
            const aspectRatio = svgHeight / svgWidth;
            let finalHeight = this.measuredContainerWidth * aspectRatio;

            if (this.maxHeight !== undefined && finalHeight > this.maxHeight) {
                finalHeight = this.maxHeight;
                // If capping by maxHeight, we might want to adjust the SVG's internal viewBox
                // or let CSS handle the scaling within the fixed height container.
                // For simplicity, we'll let the SVG scale within the container.
            }
            this.containerHeight = Math.floor(finalHeight);

            // Set viewBox on our host SVG element to match the content SVG's dimensions
            // This allows the embedded SVG (via v-html) to scale correctly.
            svgElement.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

            // Extract only the inner content of the generated SVG (children of <svg> tag)
            // to embed into our host <svg> element.
            let innerContent = "";
            for (const child of Array.from(svgRoot.children)) {
                innerContent += child.outerHTML;
            }
            this.embeddedSvgContent = innerContent;

        } catch (error: any) {
            console.error("Error drawing molecule with RDKit.js:", error);
            this.embeddedSvgContent = `<text x="50%" y="50%" fill="red" text-anchor="middle" dy=".3em">Render Error</text>`;
            this.containerHeight = this.maxHeight !== undefined ? Math.min(30, this.maxHeight) : 30;
            if (svgElement) {
                svgElement.setAttribute("viewBox", `0 0 ${this.measuredContainerWidth} ${this.containerHeight}`);
            }
        }
    }


    /**
     * Sets the measuredContainerWidth value based on the actual width of the DOM
     * container. For resizing.
     */
    setMeasuredContainerWidth() {
        if (this.smilesContainer) {
            const newWidth = this.smilesContainer.offsetWidth;
            // Only update and redraw if the width has actually changed significantly
            if (Math.abs(this.measuredContainerWidth - newWidth) > 1) {
                this.measuredContainerWidth = newWidth;
                // Watcher on measuredContainerWidth will trigger draw()
            }
        }
    }

    /**
     * Unmounted function.
     */
    unmounted() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * Mounted function.
     */
    async mounted() {
        this.smilesContainer = this.$refs["smiles-container"] as HTMLDivElement;

        try {
            this.rdkitModule = await dynamicImports.rdkitjs.module;
        } catch (error: any) {
            console.error("Error loading RDKit module:", error);
            // Optionally, display an error message to the user in the component
            this.embeddedSvgContent = `<text x="50%" y="50%" fill="red" text-anchor="middle" dy=".3em">Lib Load Error</text>`;
            this.containerHeight = 30;
            return;
        }

        this.$nextTick(() => {
            this.setMeasuredContainerWidth(); // Initial measure
            if (this.smilesToUse !== "") {
                this.draw();
            }
        });

        this.interval = setInterval(() => {
            this.setMeasuredContainerWidth();
        }, 1000); // Check for resize periodically
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.viewer-2d-smiles-container {
    display: inline-block;
    /* Allows it to sit nicely with other elements if needed */
    // border: 1px solid #ccc; /* For debugging layout */
    position: relative;
    /* If you need to position anything absolutely inside */
}

.popup-svg-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.popup-svg-container> ::v-deep(svg) {
    max-width: 100%;
    max-height: 100%;
}
</style>