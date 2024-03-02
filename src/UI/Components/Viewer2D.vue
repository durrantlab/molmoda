<template>
    <div ref="smiles-container" class="mb-4" :style="containerStyles">
        <!-- THIS GOOD IF IN VIEWER: class="mb-2 ms-2" -->
        <svg
            @click="onClick"
            :style="svgStyles"
            :id="id"
            ref="output-svg"
            viewbox="0 0 0 0"
            xmlns="http://www.w3.org/2000/svg"
        ></svg>
        <Popup
            v-if="!inPopup"
            v-model="showSmilesPopup"
            title="Molecular Structure"
            cancelBtnTxt="Close"
            id="molStructure"
        >
            <Viewer2D :smiles="smiles" :inPopup="true"></Viewer2D>
        </Popup>
    </div>
</template>

<script lang="ts">
import { dynamicImports } from "@/Core/DynamicImports";
import { randomID } from "@/Core/Utils";
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import Popup from "../Layout/Popups/Popup.vue";

/**
 * Viewer2D component
 */
@Options({
    components: {
        Popup,
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

    smilesContainer: HTMLDivElement | undefined = undefined;
    interval: any = undefined;
    id = randomID();

    measuredContainerWidth = 0;
    containerHeight = 0;
    // svgOpacityStyle = "";
    smilesFromSelected = "";
    svgScaleFactor = 1;
    showSmilesPopup = false;

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
    @Watch("containerWidth")
    onContainerWidth() {
        this.draw();
    }

    /**
     * Gets the css styles for the container div.
     *
     * @returns {string} The css styles.
     */
    get containerStyles(): string {
        // Note that height of the container div is always 0. We are only using it
        // to detect resizes, and that only in the width. Height is determined by
        // the dimensions of the molecule.
        const width = this.smilesToUse === "" ? "0" : this.width;
        return `width:${width}; height:${this.containerHeight}px; ${this.extraStyles};`;
    }

    /**
     * Gets the css styles for the svg.
     *
     * @returns {string} The css styles.
     */
    get svgStyles(): string {
        const height = this.smilesToUse === "" ? "height: 0;" : "";
        // let styles = `${height}`;
        // let styles = `${height} ${this.svgScaleStyle}`;
        let styles = `${height} width:${(this.svgScaleFactor * 100).toFixed(
            0
        )}%;`;
        styles += "margin: auto; display: block; cursor: pointer;";
        return styles;
        // styles += `position: absolute; ${height} bottom: 0;`;
        // styles += "border: 1px solid rgb(235, 235, 235); border-radius:15px;";
        // return `${styles} background-color:rgba(255, 255, 255, 0.95); ${this.svgScaleStyle}`;
    }

    /**
     * Whether component is ready.
     *
     * @returns {boolean} Whether the smilesdrawer library is loaded and ready to
     *     use.
     */
    get readyToUse(): boolean {
        if (this.smilesToUse === "") {
            // Not needed yet
            return false;
        }

        return !(this.smilesContainer === undefined);
    }

    /**
     * The smiles to use.
     *
     * @returns {string} The smiles to use.
     */
    get smilesToUse(): string {
        return this.smiles.replace(/\t/g, " ").split(" ")[0].trim();
        // if (!this.getSmilesFromSelected) {
        // }

        // return this.smilesFromSelected.trim();
    }

    /**
     * Runs when the user clicks the SVG image. Opens the bigger popup with the
     * SVG.
     */
    onClick() {
        this.showSmilesPopup = true;
    }

    /**
     * Draws the molecule.
     */
    draw() {
        
        if (!this.readyToUse) {
            return;
        }
        
        dynamicImports.smilesdrawer.module
            .then((SmilesDrawer) => {
                // Give time for canvas to be resized.

                this.$nextTick(() => {
                    const options = {
                        width: this.measuredContainerWidth,
                        height: this.measuredContainerWidth, // this.containerHeight,
                        bondThickness: 1,
                        compactDrawing: false
                    };

                    const svgDrawer = new SmilesDrawer.SvgDrawer(options);

                    SmilesDrawer.parse(this.smilesToUse, (atomTree: any) => {
                        svgDrawer.draw(atomTree, this.id, "light", false);

                        const svgElement = this.$refs[
                            "output-svg"
                        ] as SVGAElement;

                        // Crop the SVG image. See
                        // https://gist.github.com/bignimbus/56b13326c1ffd54cff84f78fda6197b3
                        const margin = 0;

                        const { x, y, width, height } = svgElement.getBBox();
                        const newWidth = width + 2 * margin;
                        const newHeight = height + 2 * margin;
                        svgElement.setAttribute(
                            "viewBox",
                            [x - margin, y - margin, newWidth, newHeight].join(
                                " "
                            )
                        );

                        setTimeout(() => {
                            const svgClientHeight = svgElement.clientHeight;

                            if (this.measuredContainerWidth === 0) {
                                this.setMeasuredContainerWidth();
                            }

                            const maxHeightToUse =
                                this.maxHeight === undefined
                                    ? this.measuredContainerWidth
                                    : Math.min(
                                          this.maxHeight as number,
                                          this.measuredContainerWidth
                                      );

                            // this.measuredContainerWidth !== 0 &&
                            if (svgClientHeight > maxHeightToUse) {
                                // It's too tall. Need to scale down.
                                // this.svgScaleStyle =
                                //   "transform: scale(" +
                                //   (this.measuredContainerWidth / svgClientHeight).toFixed(3) +
                                //   "); transform-origin: top left;";
                                // this.draw(0.9 * this.measuredContainerWidth / svgClientHeight);
                                const factor =
                                    (0.99 * maxHeightToUse) / svgClientHeight;

                                // this.svgScaleStyle = `width: ${percent}%;`;
                                this.svgScaleFactor =
                                    this.svgScaleFactor * factor;
                            } else {
                                // this.svgScaleStyle = "";
                                this.svgScaleFactor = 1;
                            }
                            setTimeout(() => {
                                this.containerHeight =
                                    svgElement.clientHeight as number;
                            }, 0);
                        }, 0);
                    });
                });

                return;
            })
            .catch((error) => {
                throw error;
            });
    }

    /**
     * Sets the measuredContainerWidth value based on the actual width of the DOM
     * container. For resizing.
     */
    setMeasuredContainerWidth() {
        this.measuredContainerWidth = this.smilesContainer
            ?.offsetWidth as number;
    }

    /**
     * Unmounted function.
     */
    unmounted() {
        clearInterval(this.interval);
    }

    /**
     * Mounted function.
     */
    mounted() {
        this.smilesContainer = this.$refs["smiles-container"] as HTMLDivElement;

        // Monitor the actual dimensions of the canvas constantly. Redraw if it
        // changes.
        this.interval = setInterval(() => {
            if (
                this.measuredContainerWidth !==
                this.smilesContainer?.offsetWidth
            ) {
                this.setMeasuredContainerWidth();
                this.draw();
            }
        }, 1000);

        // Initial draw
        if (this.smilesToUse !== "") {
            this.draw();
        }
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
