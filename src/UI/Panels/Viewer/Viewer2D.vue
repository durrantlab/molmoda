<template>
    <div ref="smiles-container" :style="`width:${width}; height:${height}; ${extraStyles};`">
        <canvas
          id="smiles-canvas"
          ref="smiles-canvas"
          :width="resolutionFactor * containerWidth"
          :height="resolutionFactor * containerHeight"
          :style="`width: 100%; height: 100%;`"
        ></canvas>
        <!-- <svg
            id="output-svg"
            viewbox="0 0 500 500"
            xmlns="http://www.w3.org/2000/svg"
          ></svg> -->
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
  @Prop({ default: "100%" }) height!: string;
  @Prop({ default: 10 }) resolutionFactor!: number;
  @Prop({ default: "" }) extraStyles!: string;

  smilesContainer: HTMLDivElement | undefined = undefined;
  interval: any = undefined;
//   offsetWidth = 0;
//   offsetHeight = 0;

  containerWidth = 0;
  containerHeight = 0;

  /**
   * The actual width to use when styling the canvas. This is a string because
   * it can be a percentage.
   *
   * @returns {string}  The width to use.
   */
//   get widthToUse(): string {
//     if (typeof this.width === "string") {
//       return this.width;
//     } else {
//       return this.width.toString() + "px";
//     }
//   }

  /**
   * The actual height to use when styling the canvas. This is a string because
   * it can be a percentage.
   *
   * @returns {string}  The height to use.
   */
//   get heightToUse(): string {
//     if (typeof this.height === "string") {
//       return this.height;
//     } else {
//       return this.height.toString() + "px";
//     }
//   }

  /**
   * Watcher for the smiles prop. Draws the molecule if smiles changes.
   */
  @Watch("smilesToUse")
  onSmilesToUse() {
    this.draw();
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

  get stylesToUse(): string {
    return "";
    // let styles = "";
    // const hidden = this.smilesToUse === "";
    // styles += `opacity: ${(hidden ? "0" : "1")};`;
    // styles += `${this.extraStyles};`;
    // styles += `${hidden ? "width:0;height:0;" : ""}`;
    // // const scale = 1.0 / this.resolutionFactor;
    // // styles += `transform: scale(${scale}, ${scale}); transform-origin: bottom left;`;
    // return styles;
    // // return `${styles} width: ${width}; height: ${height}; opacity: ${opacity}; ${this.extraStyles}`;
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
            height: this.containerHeight,
          };

          const smilesDrawer = new SmilesDrawer.Drawer(options);

          // const svgDrawer = new SmilesDrawer.SvgDrawer(options);
          SmilesDrawer.parse(this.smilesToUse, (atomTree: any) => {
            smilesDrawer.draw(atomTree, "smiles-canvas", "light", false);
            // Draw to SVG:
            // svgDrawer.draw(atomTree, "output-svg", "dark", false);
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
        this.containerWidth !== this.smilesContainer?.offsetWidth ||
        this.containerHeight !== this.smilesContainer?.offsetHeight
      ) {
        this.containerWidth = this.smilesContainer?.offsetWidth as number;
        this.containerHeight = this.smilesContainer?.offsetHeight as number;
        console.log("Updated actualWidth")
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
