<template>
    <div ref="smilesPopupViewerContainer" class="smiles-popup-viewer-container mb-4" :style="containerStyles">
        <span :style="{ cursor: inPopup || !smilesToUse ? 'default' : 'pointer' }">
            <!--
                The v-if="isIntersecting" ensures Mol2DView is only rendered
                when the container is visible.
            -->
            <Mol2DView v-if="isIntersecting && smilesToUse" :smiles="smilesToUse" :maxHeight="maxHeight"
                :drawingWidth="measuredContainerWidth > 0 ? measuredContainerWidth : undefined" :minHeight="30"
                @click="onClick" />
            <!-- 
                Optional: Add a placeholder div that has a minimum height,
                so the layout doesn't jump when the image loads.
                This placeholder will be observed by IntersectionObserver.
            -->
            <div v-else-if="!isIntersecting && smilesToUse"
                :style="{ minHeight: (maxHeight ? Math.min(maxHeight, 50) : 50) + 'px', width: '100%' }"></div>
        </span>
        <Popup v-if="!inPopup" v-model="showSmilesPopup" title="Molecular Structure" cancelBtnTxt="Close"
            id="molStructurePopupForSmiles">
            <!-- Use Mol2DView for the popup content -->
            <Mol2DView v-if="showSmilesPopup && smilesToUse" :smiles="smilesToUse" :drawingWidth="450"
                :drawingHeight="350" :minHeight="50" :showDownloadButtons="true" />
            <div v-else-if="showSmilesPopup && !smilesToUse" class="text-center p-3">
                No SMILES string provided for popup view.
            </div>
        </Popup>
    </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import Popup from "@/UI/MessageAlerts/Popups/Popup.vue";
import Mol2DView from "./Mol2DView.vue"; // Import the new reusable component

/**
 * SmilesPopupViewer component: Displays a 2D rendering of a SMILES string using
 * Mol2DView and provides a popup for a larger view upon clicking the image.
 * The initial Mol2DView is lazy-loaded.
 */
@Options({
    components: {
        Popup,
        Mol2DView,
    },
})
export default class SmilesPopupViewer extends Vue {
    @Prop({ default: "" }) smiles!: string;
    @Prop({ default: "100%" }) width!: string;
    @Prop({ default: undefined }) maxHeight!: number | undefined;
    @Prop({ default: "" }) extraStyles!: string;
    @Prop({ default: false }) inPopup!: boolean; // If this instance itself is already in a popup

    private smilesPopupViewerContainer: HTMLDivElement | undefined = undefined;
    private resizeInterval: any = undefined;
    private intersectionObserver: IntersectionObserver | null = null;

    // Reactive properties
    private measuredContainerWidth = 0;
    private showSmilesPopup = false;
    private isIntersecting = false; // True when the component is visible in the viewport

    /**
     * Watcher for the external width prop.
     * This ensures that if the parent container changes its width definition for this component,
     * we re-measure and potentially re-render.
     */
    @Watch("width")
    onWidthPropChanged() {
        this.$nextTick(() => {
            this.updateMeasuredContainerWidth();
        });
    }

    /**
     * Gets the CSS styles for the main container div.
     * The height is mostly determined by the Mol2DView content or maxHeight.
     * 
     * @returns {string} The style string.
     */
    get containerStyles(): string {
        const displayWidth = this.smilesToUse ? this.width : "0";
        let style: Record<string, string | number> = {
            width: displayWidth,
            minHeight: this.smilesToUse ? '50px' : '0px', // Ensure some height even for errors or loading
            // display: 'flex', // Mol2DView will handle its own centering
            // alignItems: 'center',
            // justifyContent: 'center',
        };
        if (this.extraStyles) {
            try {
                const extra = JSON.parse(`{${this.extraStyles.replace(/'/g, '"')}}`);
                style = { ...style, ...extra };
            } catch (e) {
                console.warn("Could not parse extraStyles for SmilesPopupViewer container", e);
            }
        }
        if (this.maxHeight !== undefined) {
            style['maxHeight'] = `${this.maxHeight}px`;
        }
        if (!this.smilesToUse) { // Collapse if no smiles
            style['height'] = '0px';
            style['minHeight'] = '0px';
            style['padding'] = '0';
            style['margin'] = '0';
            style['border'] = 'none';
        }

        // Convert into a CSS string for inline styles
        let styleString = "";
        for (const [key, value] of Object.entries(style)) {
            styleString += `${key}: ${value}; `;
        }
        return styleString;
    }

    /**
     * The SMILES string to use for rendering, trimmed and cleaned.
     * 
     * @returns {string} The processed SMILES string.
     */
    get smilesToUse(): string {
        return this.smiles.replace(/\t/g, " ").split(" ")[0].trim();
    }

    /**
     * Handles click on the inline Mol2DView image to show a larger version in a popup.
     */
    onClick() {
        if (!this.inPopup && this.smilesToUse) {
            this.showSmilesPopup = true;
        }
    }

    /**
     * Sets the `measuredContainerWidth` based on the actual width of the DOM container.
     * This width is then passed to the inline Mol2DView.
     */
    updateMeasuredContainerWidth() {
        if (this.smilesPopupViewerContainer) {
            const newWidth = this.smilesPopupViewerContainer.offsetWidth;
            if (this.measuredContainerWidth !== newWidth) {
                this.measuredContainerWidth = newWidth;
            }
        }
    }

    /**
     * Sets up the IntersectionObserver to detect when the component is visible.
     */
    private setupIntersectionObserver(): void {
        this.smilesPopupViewerContainer = this.$refs["smilesPopupViewerContainer"] as HTMLDivElement;
        if (!this.smilesPopupViewerContainer) return;

        const options = {
            root: null, // relative to the viewport
            rootMargin: "0px",
            threshold: 0.01, // as soon as 1% of the element is visible
        };

        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.isIntersecting = true;
                    // Once it's visible, we don't need to observe anymore
                    if (this.smilesPopupViewerContainer && this.intersectionObserver) {
                        this.intersectionObserver.unobserve(this.smilesPopupViewerContainer);
                    }
                }
            });
        }, options);

        this.intersectionObserver.observe(this.smilesPopupViewerContainer);
    }

    /**
     * Lifecycle hook called when the component is unmounted.
     * Clears the resize interval and disconnects the IntersectionObserver.
     */
    unmounted() {
        if (this.resizeInterval) {
            clearInterval(this.resizeInterval);
            this.resizeInterval = null;
        }
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
    }

    /**
     * Lifecycle hook called when the component is mounted.
     * Sets up an interval to check for container width changes and initializes the IntersectionObserver.
     */
    async mounted() {
        this.smilesPopupViewerContainer = this.$refs["smilesPopupViewerContainer"] as HTMLDivElement;

        this.$nextTick(() => {
            this.updateMeasuredContainerWidth();
            // Only set up observer if there's a SMILES string to potentially display
            if (this.smilesToUse) {
                this.setupIntersectionObserver();
            } else {
                // If there's no SMILES, we can consider it "intersecting" to avoid blank space
                // if it were to get SMILES later and not be observed. Or simply, do nothing.
                // For now, if no smiles, it won't render Mol2DView anyway.
            }
        });

        // Periodically check for width changes. A ResizeObserver on smilesPopupViewerContainer
        // would be more efficient if this becomes a performance concern.
        this.resizeInterval = setInterval(() => {
            this.updateMeasuredContainerWidth();
        }, 500);
    }
}
</script>

<style scoped lang="scss">
.smiles-popup-viewer-container {
    display: inline-block;
    /* Default display, can be overridden by extraStyles */
    position: relative;
    // Adding a default border for clarity, can be removed or overridden
    // border: 1px solid #e0e0e0; 
    // padding: 5px; 
    box-sizing: border-box;
}
</style>