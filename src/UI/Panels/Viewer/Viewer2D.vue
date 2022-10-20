<template>
  <div ref="smiles-container" :style="containerStyles">
    <svg
      class="mb-2 ms-2"
      :style="svgStyles"
      id="output-svg"
      ref="output-svg"
      viewbox="0 0 0 0"
      xmlns="http://www.w3.org/2000/svg"
    ></svg>
  </div>
</template>
  
<script lang="ts">
import { dynamicImports } from "@/Core/DynamicImports";
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";

/**
 * Viewer2D component
 */
@Options({})
export default class Viewer2D extends Vue {
  @Prop({ default: "" }) smiles!: string;
  @Prop({ default: "100%" }) width!: string;
  // Should not specify height
  @Prop({ default: "" }) extraStyles!: string;

  smilesContainer: HTMLDivElement | undefined = undefined;
  interval: any = undefined;

  measuredContainerWidth = 0;
  svgScaleStyle = "";

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
    const width = this.smiles === "" ? "0" : this.width;
    return `width:${width}; height:0; ${this.extraStyles};`;
  }

  /**
   * Gets the css styles for the svg.
   *
   * @returns {string} The css styles.
   */
  get svgStyles(): string {
    const height = this.smiles === "" ? "height: 0;" : "";
    let styles = `position: absolute; ${height} bottom: 0;`;
    styles += "border: 1px solid rgb(235, 235, 235); border-radius:15px;";
    return `${styles} background-color:rgba(255, 255, 255, 0.95); ${this.svgScaleStyle}`;
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
    return this.smiles.trim();
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
          };

          const svgDrawer = new SmilesDrawer.SvgDrawer(options);

          SmilesDrawer.parse(this.smilesToUse, (atomTree: any) => {
            svgDrawer.draw(atomTree, "output-svg", "light", false);

            const svgElement = this.$refs["output-svg"] as SVGAElement;

            // Crop the SVG image. See
            // https://gist.github.com/bignimbus/56b13326c1ffd54cff84f78fda6197b3
            const margin = 15;

            const { x, y, width, height } = svgElement.getBBox();
            const newWidth = width + 2 * margin;
            const newHeight = height + 2 * margin;
            svgElement.setAttribute(
              "viewBox",
              [x - margin, y - margin, newWidth, newHeight].join(" ")
            );

            const svgClientHeight = svgElement.clientHeight;

            if (
              this.measuredContainerWidth !== 0 &&
              svgClientHeight > this.measuredContainerWidth
            ) {
              // It's too tall. Need to scale down.
              this.svgScaleStyle =
                "transform: scale(" +
                (this.measuredContainerWidth / svgClientHeight).toFixed(3) +
                "); transform-origin: bottom left;";
            } else {
              this.svgScaleStyle = "";
            }
          });
        });

        return;
      })
      .catch((error) => {
        console.error(error);
      });
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

    // Monitor the actual dimensions of the canvas constantly
    this.interval = setInterval(() => {
      if (this.measuredContainerWidth !== this.smilesContainer?.offsetWidth) {
        this.measuredContainerWidth = this.smilesContainer
          ?.offsetWidth as number;
      }
    }, 1000);
  }
}
</script>
  
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
