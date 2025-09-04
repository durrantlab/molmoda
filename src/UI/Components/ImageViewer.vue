<template>
    <div class="image-viewer-container">
        <div v-if="sourceType === 'svg'" class="svg-wrapper" ref="svgElementRef" v-html="sanitizedSvg"
            :style="viewerStyle">
        </div>
        <img v-else-if="sourceType === 'png-datauri' || sourceType === 'png-url'" :src="source" ref="pngElementRef"
            alt="Image" class="png-image" :style="viewerStyle" @load="adjustImageDimensions" @error="onImageError" />
        <!-- <div v-else class="invalid-source p-1 text-center"> -->
        <!-- <Alert type="danger" class="p-0 m-0">Invalid image source or type provided.</Alert> -->
        <!-- <p>Invalid image source or type provided.</p> -->
        <!-- </div> -->

        <!-- Download and copy buttons -->
        <div v-if="showDownloadButtons && (sourceType === 'svg' || sourceType === 'png-datauri' || sourceType === 'png-url')"
            class="download-buttons-container mt-2 text-center">

            <template v-if="sourceType === 'svg'">
                <button @click.prevent="downloadSvg" class="badge rounded-pill btn btn-sm btn-primary me-2">Download
                    SVG</button>
                <button @click.prevent="downloadPngFromSvg"
                    class="badge rounded-pill btn btn-sm btn-primary me-2">Download PNG</button>
                <button @click.prevent="copySvgText" class="badge rounded-pill btn btn-sm btn-primary">Copy SVG</button>
            </template>
            <template v-else-if="sourceType === 'png-datauri' || sourceType === 'png-url'">
                <button @click.prevent="downloadPngFromPngSource"
                    class="badge rounded-pill btn btn-sm btn-primary me-2">Download PNG</button>
                <button @click.prevent="copyPngImage" class="badge rounded-pill btn btn-sm btn-primary">Copy
                    Image</button>
            </template>
        </div>
    </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import * as api from "@/Api";
import { FileInfo } from "@/FileSystem/FileInfo";
import { fetcher, ResponseType } from "@/Core/Fetcher";
import Alert from "@/UI/Layout/Alert.vue";
import { PopupVariant } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import { sanitizeSvg } from "@/Core/Security/Sanitize";
type SourceType = "svg" | "png-datauri" | "png-url" | "unknown";

/**
 * ImageViewer component for displaying SVG or PNG images with download/copy functionality.
 */
@Options({
    components: {
        Alert,
    },
    emits: ["onValidImageDetect"],
})
export default class ImageViewer extends Vue {
    @Prop({ type: String, required: true })
    source!: string;

    @Prop({ type: String, default: "image" })
    filenameBase!: string;

    @Prop({ type: Number, default: undefined })
    maxHeight?: number;

    @Prop({ type: Number, default: undefined })
    minHeight?: number;

    @Prop({ type: Boolean, default: true })
    showDownloadButtons!: boolean;

    internalSourceType: SourceType = "unknown";
    imageWidth: number | null = null;
    imageHeight: number | null = null;

    sanitizedSvg = "";

    /**
     * Gets the computed style for the viewer element.
     * 
     * @returns {any} The style object.
     */
    get viewerStyle(): Record<string, string> {
        const style: Record<string, string> = {};
        if (this.maxHeight) {
            style.maxHeight = `${this.maxHeight}px`;
        }
        if (this.minHeight) {
            style.minHeight = `${this.minHeight}px`;
        }

        // For SVG, the wrapper will handle the sizing constraints
        if (this.sourceType === 'svg') {
            style.display = 'flex';
            style.justifyContent = 'center';
            style.alignItems = 'center';
            style.maxWidth = '100%';
            style.width = '100%';
        } else if (this.imageWidth && this.imageHeight) {
            // For PNG, maintain aspect ratio if maxHeight is hit
            style.objectFit = 'scale-down';
            style.width = 'auto';
            style.height = 'auto';
            if (this.maxHeight && this.imageHeight > this.maxHeight) {
                style.height = `${this.maxHeight}px`;
                style.width = `${(this.imageWidth * this.maxHeight) / this.imageHeight}px`;
            }
        } else {
            style.maxWidth = '100%';
            style.height = 'auto';
        }
        return style;
    }

    /**
     * Lifecycle hook called when the component is mounted.
     */
    mounted() {
        if (this.sourceType === 'svg') {
            this.$nextTick(() => {
                this.adjustSvgDimensions();
            });
        }
    }

    /**
     * Watches for changes in the source prop.
     * 
     * @param {string} newSource - The new source string.
     */
    @Watch("source", { immediate: true })
    async onSourceChanged(newSource: string): Promise<void> {
        this.determineSourceTypeAndEmit();
        if (this.internalSourceType === "svg") {
            this.sanitizedSvg = await sanitizeSvg(this.source);
            this.$nextTick(() => {
                this.adjustSvgDimensions();
            });
        }
    }

    /**
     * Determines the type of the source and emits the validity.
     */
    determineSourceTypeAndEmit(): void {
        if (typeof this.source !== "string" || this.source.trim() === "") {
            this.internalSourceType = "unknown";
        } else {
            const trimmedSource = this.source.trim();
            if (trimmedSource.includes("<svg") && trimmedSource.includes("</svg>")) {
                this.internalSourceType = "svg";
            } else if (trimmedSource.startsWith("data:image/png;base64,")) {
                this.internalSourceType = "png-datauri";
            } else if (
                trimmedSource.match(/\.(png|jpeg|jpg|gif|webp)$/i) ||
                (trimmedSource.startsWith("http://") || trimmedSource.startsWith("https://"))
            ) {
                this.internalSourceType = "png-url";
            } else {
                this.internalSourceType = "unknown";
            }
        }
        // Emit the current validity status *after* internalSourceType is set
        this.$emit("onValidImageDetect", this.internalSourceType !== 'unknown');
    }

    /**
     * Gets the determined source type.
     * 
     * @returns {SourceType} The type of the source.
     */
    get sourceType(): SourceType {
        return this.internalSourceType;
    }

    /**
     * Adjusts SVG dimensions after it's rendered, if needed.
     */
    adjustSvgDimensions(): void {
        const svgElement = this.$refs.svgElementRef as HTMLElement;

        svgElement.firstChild

        if (!svgElement || !svgElement.childNodes) {
            console.warn("SVG element not found or has no children for adjustment.");
            return;
        }

        for (const svgNode of svgElement.childNodes) {
            if (!(svgNode instanceof SVGSVGElement)) { continue; } // Ensure it's an SVG element
            if (svgNode.tagName?.toLowerCase() === 'svg') {
                // Store original dimensions for viewBox if needed
                const originalWidth = svgNode.getAttribute('width');
                const originalHeight = svgNode.getAttribute('height');

                // Ensure the SVG has proper attributes for scaling
                if (!svgNode.getAttribute('viewBox')) {
                    if (originalWidth && originalHeight) {
                        const w = parseFloat(originalWidth);
                        const h = parseFloat(originalHeight);
                        if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
                            svgNode.setAttribute('viewBox', `0 0 ${w} ${h}`);
                        }
                    } else {
                        // Try to get bounding box as fallback
                        try {
                            const bbox = svgNode.getBBox();
                            if (bbox.width > 0 && bbox.height > 0) {
                                svgNode.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
                            }
                        } catch (e) {
                            // getBBox might fail on invisible elements, set a default
                            svgNode.setAttribute('viewBox', '0 0 100 100');
                        }
                    }
                }

                // Force the SVG to be scalable by removing fixed dimensions
                svgNode.removeAttribute('width');
                svgNode.removeAttribute('height');

                // Set explicit CSS properties to ensure scaling
                svgNode.style.width = '100%';
                svgNode.style.height = '100%';
                svgNode.style.maxWidth = '100%';
                svgNode.style.maxHeight = this.maxHeight ? `${this.maxHeight}px` : 'auto';
                svgNode.style.display = 'block';

                // Add CSS class for styling
                svgNode.classList.add('scaled-svg');

            }
        }
    }

    /**
     * Adjusts image dimensions after it loads to help with maxHeight styling.
     * 
     * @param {Event} event - The load event from the image.
     */
    adjustImageDimensions(event: Event): void {
        const img = event.target as HTMLImageElement;
        this.imageWidth = img.naturalWidth;
        this.imageHeight = img.naturalHeight;
    }

    /**
     * Handles image loading errors.
     */
    onImageError(): void {
        this.internalSourceType = "unknown";
        this.$emit("onValidImageDetect", false);
    }

    /**
     * Extracts the pure SVG string from the rendered v-html content.
     * 
     * @returns {string | null} The SVG string or null if not found.
     */
    private _getPureSvgString(): string | null {
        if (this.sourceType !== "svg") return null;
        const svgElementWrapper = this.$refs.svgElementRef as HTMLElement | undefined;
        if (!svgElementWrapper) {
            console.error("SVG wrapper element not found for SVG extraction.");
            return null;
        }

        // Create a temporary div to parse the source string and get the SVG node
        // This avoids modifying the displayed SVG directly if it's wrapped
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.source; // this.source might contain wrapper divs
        const svgNodeOriginal = tempDiv.querySelector("svg") as SVGSVGElement | null;

        if (!svgNodeOriginal) {
            console.error("SVG element not found within source for SVG extraction.");
            return null;
        }

        // Clone the node to avoid modifying the one potentially displayed by v-html if source was pure SVG
        const svgNode = svgNodeOriginal.cloneNode(true) as SVGSVGElement;

        let width = svgNode.getAttribute("width");
        let height = svgNode.getAttribute("height");
        let viewBox = svgNode.getAttribute("viewBox");

        if (!viewBox) {
            // Attempt to calculate viewBox if missing
            try {
                // Fallback: if width and height are present, use them to create a viewBox
                if (width && height) {
                    const w = parseFloat(width);
                    const h = parseFloat(height);
                    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
                        viewBox = `0 0 ${w} ${h}`;
                        svgNode.setAttribute("viewBox", viewBox);
                    }
                } else {
                    console.warn("SVG missing viewBox. Pasting might be unpredictable. Consider adding viewBox to the source SVG.");
                }
            } catch (e) {
                console.error("Error trying to calculate viewBox:", e);
            }
        }

        if (!width && viewBox) {
            const vbParts = viewBox.split(" ");
            if (vbParts.length === 4) {
                svgNode.setAttribute("width", vbParts[2]);
            }
        }
        if (!height && viewBox) {
            const vbParts = viewBox.split(" ");
            if (vbParts.length === 4) {
                svgNode.setAttribute("height", vbParts[3]);
            }
        }

        // Ensure width and height are present if viewBox is, to help Illustrator
        if (viewBox && (!width || !height)) {
            const vbParts = viewBox.split(/[\s,]+/); // Handles space or comma separators
            if (vbParts.length === 4) {
                if (!width) svgNode.setAttribute("width", vbParts[2]);
                if (!height) svgNode.setAttribute("height", vbParts[3]);
            }
        }

        return new XMLSerializer().serializeToString(svgNode);
    }

    /**
     * Downloads the SVG content as an SVG file.
     */
    downloadSvg(): void {
        const pureSvgString = this._getPureSvgString();
        if (!pureSvgString) {
            api.messages.popupError("Could not extract SVG content for download.");
            return;
        }
        const fileInfo = new FileInfo({
            name: `${this.filenameBase}.svg`,
            contents: pureSvgString,
        });
        api.fs.saveSvg(fileInfo);
    }

    /**
     * Converts the displayed SVG to a PNG data URI.
     *
     * @returns {Promise<string | null>} A promise that resolves with the PNG
     *     data URI, or null if an error occurs.
     */
    private async _svgToPngDataUri(): Promise<string | null> {
        const svgElement = this.$refs.svgElementRef as HTMLElement | undefined;
        if (!svgElement || !svgElement.querySelector("svg")) {
            console.error("SVG element not found for PNG conversion.");
            return null;
        }
        const svgNode = svgElement.querySelector("svg") as SVGSVGElement;

        const svgData = new XMLSerializer().serializeToString(svgNode);
        const img = new Image();

        return new Promise((resolve) => {
            img.onload = () => {
                let sourceWidth = img.naturalWidth;
                let sourceHeight = img.naturalHeight;

                // If SVG has no explicit width/height from img.naturalWidth/Height,
                // try to use viewBox or clientWidth/Height as fallbacks.
                if (sourceWidth === 0 || sourceHeight === 0) {
                    sourceWidth = svgNode.viewBox?.baseVal?.width || svgElement.clientWidth || 500;
                    sourceHeight = svgNode.viewBox?.baseVal?.height || svgElement.clientHeight || 500;
                }

                // Ensure we have valid dimensions to avoid division by zero or tiny images
                if (sourceWidth <= 0 || sourceHeight <= 0) {
                    console.error("Cannot determine valid SVG dimensions for PNG conversion. Defaulting to 500x500.");
                    sourceWidth = 500;
                    sourceHeight = 500;
                }

                // Ensure at least one dimension is 1024px while preserving aspect ratio
                const minDimension = 1024;
                const scale = Math.max(minDimension / sourceWidth, minDimension / sourceHeight);

                // Calculate the final dimensions
                const targetWidth = Math.round(sourceWidth * scale);
                const targetHeight = Math.round(sourceHeight * scale);

                console.log(`PNG export: SVG ${sourceWidth}x${sourceHeight} -> scaled to ${targetWidth}x${targetHeight} (scale: ${scale.toFixed(3)})`);

                // Create off-screen canvas with exact dimensions needed
                const canvas = document.createElement("canvas");
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext("2d");

                if (!ctx) {
                    console.error("Failed to get canvas context for PNG conversion.");
                    resolve(null);
                    return;
                }

                // Fill with white background (optional - remove for transparent background)
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, targetWidth, targetHeight);

                // Draw the SVG scaled to exact canvas size
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                resolve(canvas.toDataURL("image/png"));
            };

            img.onerror = () => {
                console.error("Error loading SVG into image for PNG conversion.");
                resolve(null);
            }

            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
        });
    }

    /**
     * Downloads the displayed SVG as a PNG file.
     */
    async downloadPngFromSvg(): Promise<void> {
        if (this.sourceType !== "svg") return;
        const dataUri = await this._svgToPngDataUri();
        if (dataUri) {
            api.fs.savePngUri(`${this.filenameBase}.png`, dataUri);
        } else {
            api.messages.popupError("Failed to convert SVG to PNG for download.");
        }
    }

    /**
     * Downloads the displayed PNG image.
     */
    async downloadPngFromPngSource(): Promise<void> {
        if (this.sourceType === "png-datauri") {
            api.fs.savePngUri(`${this.filenameBase}.png`, this.source);
        } else if (this.sourceType === "png-url") {
            try {
                const blob = await fetcher(this.source, { responseType: ResponseType.BLOB });
                const reader = new FileReader();
                reader.onloadend = () => {
                    api.fs.savePngUri(`${this.filenameBase}.png`, reader.result as string);
                };
                reader.readAsDataURL(blob);
            } catch (error) {
                console.error("Failed to download PNG from URL:", error);
                api.messages.popupError("Failed to download PNG from URL.");
            }
        }
    }

    /**
     * Copies the SVG content to the clipboard as plain text.
     */
    async copySvgText(): Promise<void> {
        const pureSvgString = this._getPureSvgString();
        if (!pureSvgString) {
            api.messages.popupError("Could not extract SVG content for copying.");
            return;
        }

        try {
            await navigator.clipboard.writeText(pureSvgString);
            api.messages.popupMessage("SVG Copied", "SVG code copied to clipboard.", PopupVariant.Success, undefined, false, {});
        } catch (err) {
            console.error("Failed to copy SVG text: ", err);
            api.messages.popupError("Failed to copy SVG code to clipboard.");
        }
    }

    /**
     * Copies the displayed PNG image to the clipboard.
     */
    async copyPngImage(): Promise<void> {
        if (this.sourceType !== "png-datauri" && this.sourceType !== "png-url") return;

        try {
            let blob: Blob;
            if (this.sourceType === "png-datauri") {
                const fetchResponse = await fetcher(this.source);
                blob = await fetchResponse.blob();
            } else { // png-url
                blob = await fetcher(this.source, { responseType: ResponseType.BLOB });
            }

            if (navigator.clipboard && navigator.clipboard.write && (window as any).ClipboardItem) {
                await navigator.clipboard.write([
                    new (window as any).ClipboardItem({ [blob.type]: blob })
                ]);
                api.messages.popupMessage("Image Copied", "Image copied to clipboard.", PopupVariant.Success, undefined, false, {});
            } else {
                // Fallback for browsers that don't support ClipboardItem or write for blobs (e.g. older Safari)
                // Copy as data URI text
                const reader = new FileReader();
                reader.onloadend = async () => {
                    try {
                        await navigator.clipboard.writeText(reader.result as string);
                        api.messages.popupMessage("Image Copied", "Image Data URI copied to clipboard (fallback).", PopupVariant.Success, undefined, false, {});
                    } catch (copyErr) {
                        console.error("Fallback: Failed to copy PNG Data URI: ", copyErr);
                        api.messages.popupError("Fallback: Failed to copy image data to clipboard.");
                    }
                };
                reader.readAsDataURL(blob);
            }
        } catch (err) {
            console.error("Failed to copy PNG image: ", err);
            api.messages.popupError("Failed to copy image to clipboard.");
        }
    }
}
</script>

<style scoped lang="scss">
.image-viewer-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.svg-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    max-width: 100%;
    width: 100%;
    // Ensure the wrapper itself doesn't exceed the maxHeight
    box-sizing: border-box;
    // Use flex to properly constrain children
    flex-shrink: 0;
}

.png-image {
    display: block;
    margin-left: auto;
    margin-right: auto;
    max-width: 100%;
    /* height is managed by viewerStyle or auto */
}

// More aggressive SVG scaling approach
.svg-wrapper ::v-deep(svg),
.svg-wrapper ::v-deep(.scaled-svg) {
    // Force the SVG to scale within the wrapper bounds
    max-width: 100% !important;
    // max-height: 100% !important;
    width: 100% !important;
    // height: 100% !important;
    display: block !important;
    // Ensure the SVG respects the container size
    object-fit: contain;
    // Override any inline styles that might interfere
    box-sizing: border-box !important;
}

.invalid-source {
    color: var(--bs-danger);
    height: 30px;
}

.download-buttons-container {
    padding-bottom: 4px;
}

// .download-buttons-container button {
//     /* Basic button styling - can be adjusted */
//     /* margin: 0 5px; */
//     /* padding: 5px 10px; */
//     /* font-size: 0.875rem; */
//     // z-index: 100;

// }

/* If you want to exactly match the Mol2DView badges, you might need these
   if they aren't globally available from Bootstrap: */
/*
.badge {
  display: inline-block;
  padding: .35em .65em;
  font-size: .75em;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  text-align: center;
  white-space: nowrap;
  vertical-align: baseline;
  border-radius: .25rem;
}

.rounded-pill {
  border-radius: 50rem !important;
}

.btn {
  display: inline-block;
  font-weight: 400;
  line-height: 1.5;
  color: #212529;
  text-align: center;
  text-decoration: none;
  vertical-align: middle;
    cursor: pointer;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  background-color: transparent;
  border: 1px solid transparent;
  padding: .375rem .75rem;
  font-size: 1rem;
  border-radius: .25rem;
  transition: color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out;
}

.btn-sm {
  padding: .25rem .5rem;
  font-size: .875rem;
  border-radius: .2rem;
}

.btn-primary {
  color: #fff;
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.me-2 {
  margin-right: .5rem !important;
}
*/
</style>