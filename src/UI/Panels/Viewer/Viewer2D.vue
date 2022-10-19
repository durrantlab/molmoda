<template>
  <div ref="smiles-container" :style="containerStyles">
    <!-- <canvas
          id="smiles-canvas"
          ref="smiles-canvas"
          :width="resolutionFactor * containerWidth"
          :height="resolutionFactor * containerHeight"
          :style="`width: 100%; height: 100%;`"
        ></canvas> -->
    <svg
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
//   @Prop({ default: "100%" }) height!: string;  // Should not specify height
  @Prop({ default: "" }) extraStyles!: string;

  smilesContainer: HTMLDivElement | undefined = undefined;
  interval: any = undefined;

  containerWidth = 0;
//   containerHeight = 0;

  /**
   * Watcher for the smiles prop. Draws the molecule if smiles changes.
   */
  @Watch("smilesToUse")
  onSmilesToUse() {
    this.draw();
  }

  @Watch("containerWidth")
  onContainerWidth() {
    this.draw();
  }

//   @Watch("containerHeight")
//   onContainerHeight() {
//     this.draw();
//   }

  get containerStyles(): string {
    const width = this.smiles === "" ? "0" : this.width;
    // const height = this.smiles === "" ? "0" : this.height;

    // return `width:${width}; height:${this.containerHeight.toFixed(0)}px; ${this.extraStyles};`;
    return `width:${width}; height:0; ${this.extraStyles};`;
  }

  get svgStyles(): string {
    const height = this.smiles === "" ? "height: 0;" : "";
    return `position: absolute; ${height} bottom: 0; background-color:rgba(255, 255, 255, 0.95);`;
  }

  get readyToUse(): boolean {
    if (this.smilesToUse === "") {
      // Not needed yet
      return false;
    }

    return !(this.smilesContainer === undefined);
  }

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

    // let canvas = this.canvas as HTMLCanvasElement; // For local use.
    // this.offsetHeight = canvas.offsetHeight;
    // this.offsetWidth = canvas.offsetWidth;

    dynamicImports.smilesdrawer.module
      .then((SmilesDrawer) => {
        // Give time for canvas to be resized.
        this.$nextTick(() => {
          const options = {
            //   debug: false,
            //   atomVisualization: "default",
            width: this.containerWidth,
            height: this.containerWidth, // this.containerHeight,
            bondThickness: 1,
            // compactDrawing: false
          };

          //   const smilesDrawer = new SmilesDrawer.Drawer(options);
          const svgDrawer = new SmilesDrawer.SvgDrawer(options);

          SmilesDrawer.parse(this.smilesToUse, (atomTree: any) => {
            // smilesDrawer.draw(atomTree, "smiles-canvas", "light", false);
            // Draw to SVG:
            svgDrawer.draw(atomTree, "output-svg", "light", false);

            const svgElement = this.$refs["output-svg"] as SVGAElement;

            const margin = 20;

            const { x, y, width, height } = svgElement.getBBox();
            const newWidth = width + 2 * margin;
            const newHeight = height + 2 * margin;
            const viewBoxValue = [x - margin, y - margin, newWidth, newHeight].join(
              " "
            );
            svgElement.setAttribute("viewBox", viewBoxValue);
            
            // Also adjust height on container
            // if (this.containerWidth !== 0) {
            //     // debugger;
            //     this.containerHeight = Math.round(this.containerWidth * newHeight / newWidth);
            // }
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
      if (
        this.containerWidth !== this.smilesContainer?.offsetWidth // ||
        // this.containerHeight !== this.smilesContainer?.offsetHeight
      ) {
        this.containerWidth = this.smilesContainer?.offsetWidth as number;
        // this.containerHeight = this.smilesContainer?.offsetHeight as number;
        // console.log("Updated actualWidth");
      }
    }, 1000);

    // // Detect when the component is resized. See
    // // https://stackoverflow.com/questions/5825447/javascript-event-for-canvas-resize
    // // Get actual width and height of canvas.
    // let canvasHeight = 0;
    // let canvasWidth = 0;
    // this.interval = setInterval(() => {
    //   let canvas = this.canvas as HTMLCanvasElement; // For local use.

    //   this.offsetHeight = canvas.offsetHeight;
    //   this.offsetWidth = canvas.offsetWidth;

    //   if (
    //     this.offsetHeight !== canvasHeight ||
    //     this.offsetWidth !== canvasWidth
    //   ) {
    //     canvasHeight = this.offsetHeight;
    //     canvasWidth = this.offsetWidth;
    //     this.draw();
    //   }
    // }, 1000);
  }
}
</script>
  
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
