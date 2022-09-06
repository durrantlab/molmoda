<template>
  <div class="ms-2">
    <FormFull v-model="constructedColorForm"></FormFull>
  </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import Section from "@/UI/Layout/Section.vue";
import FormSelect from "@/UI/Forms/FormSelect.vue";

import FormFull from "@/UI/Forms/FormFull/FormFull.vue";
import { IColorStyle, IStyle } from "@/UI/Navigation/TreeView/TreeInterfaces";

// @ts-ignore
import isEqual from "lodash.isequal";

import { colorNameToHex, hexToColorName } from "./ColorConverter";
import { FormElemType } from "@/UI/Forms/FormFull/FormFullInterfaces";

interface INameAndColorStyle {
  name: string;
  colorStyle: IColorStyle;
}

/**
 * Data class to store information about color styles.
 */
class ColorStyleOptions {
  private _colorStyles: INameAndColorStyle[] = [
    {
      name: "Element",
      colorStyle: { colorscheme: "default" },
    },
    {
      name: "ColorCarbons",
      colorStyle: { colorscheme: "#COLORNAMECarbon" },
      // colorStyle: { colorscheme: "LightCoralCarbon" },
    },
    {
      name: "Spectrum",
      colorStyle: { color: "spectrum" },
    },
    {
      name: "SecondaryStructure",
      colorStyle: { colorscheme: "ssJmol" },
    },
    {
      name: "Chain",
      colorStyle: { colorscheme: "chain" },
    },
    {
      name: "Solid",
      colorStyle: { color: "#HEX" },
    },
  ];

  public defaultColor = "#C0C0C0"; // silver
  public color = "#C0C0C0"; // silver

  /**
   * Converts a name to an index in _colorStyles.
   * 
   * @param {string} name  The name.
   * @returns {number} The index.
   */
  public nameToIndex(name: string): number {
    return this._colorStyles.findIndex(
      (colorStyle) => colorStyle.name === name
    );
  }

  /**
   * Converts a style to an index in the _colorStyles array.
   * 
   * @param {IColorStyle} style  The style.
   * @returns {number} The index.
   */
  public styleToIndex(style: IColorStyle): number {
    if (style.color !== undefined && style.color !== "spectrum") {
      // It must be "Solid"
      return this.nameToIndex("Solid");
    }

    if (
      style.colorscheme !== undefined &&
      style.colorscheme.endsWith("Carbon")
    ) {
      // It must be "ColorCarbons"
      return this.nameToIndex("ColorCarbons");
    }

    // If you get here, it's easy to determine based on deep equality.
    return this._colorStyles.findIndex((colorStyle) =>
      isEqual(colorStyle.colorStyle, style)
    );
  }

  /**
   * Converts an index in the _colorStyles array to a name.
   * 
   * @param {number} index  The index.
   * @returns {string} The name.
   */
  public indexToName(index: number): string {
    return this._colorStyles[index].name;
  }

  /**
   * Adds a color to the style
   * 
   * @param {IColorStyle} colorStyle  The color style.
   * @returns {IColorStyle}  The color style with the color added.
   */
  private _addColorToStyle(colorStyle: IColorStyle): IColorStyle {
    let strColorStyle = JSON.stringify(colorStyle);

    // Has #HEX?
    if (strColorStyle.indexOf("#HEX") > -1) {
      strColorStyle = strColorStyle.replace(/#HEX/g, this.color);
    }

    // Has #COLORNAME?
    if (strColorStyle.indexOf("#COLORNAME") > -1) {
      strColorStyle = strColorStyle.replace(
        /#COLORNAME/g,
        hexToColorName(this.color)
      );
    }

    return JSON.parse(strColorStyle);
  }

  /**
   * Given an index in the _colorStyles array, returns the color style.
   * 
   * @param {number} index  The index.
   * @returns {IColorStyle}  The color style.
   */
  public indexToStyle(index: number): IColorStyle {
    let colorStyle = this._colorStyles[index].colorStyle;
    colorStyle = this._addColorToStyle(colorStyle);
    return colorStyle;
  }

  /**
   * Given a name, returns the color style.
   * 
   * @param {string} name  The name.
   * @returns {IColorStyle}  The color style.
   */
  public nameToStyle(name: string): IColorStyle {
    let colorStyle = this._colorStyles[this.nameToIndex(name)].colorStyle;
    colorStyle = this._addColorToStyle(colorStyle);
    return colorStyle;
  }

  /**
   * Given a color style, get the hex colors.
   * 
   * @param {IStyle} style  The style.
   * @returns {string[]}  The hex colors.
   */
  public extractHexColorsFromStyle(style: IStyle): string[] {
    const styleRecast = style as { [key: string]: IColorStyle };
    const colors: string[] = [];
    for (const rep in styleRecast) {
      const colorStyle = styleRecast[rep] as IColorStyle;
      // Is it hex?
      if (colorStyle.color?.startsWith("#")) {
        colors.push(colorStyle.color);
      }

      // Is it colorName?
      if (colorStyle.colorscheme?.endsWith("Carbon")) {
        // Remove Carbon at end.
        let colorName = colorStyle.colorscheme.substring(
          0,
          colorStyle.colorscheme.length - 6
        );
        colors.push(colorNameToHex(colorName));
      }
    }

    return colors;
  }
}

/**
 * ColorStyle component
 */
@Options({
  components: {
    Section,
    FormSelect,
    FormFull,
  },
  emits: { onChange: "onChange", "update:modelValue": "update:modelValue" },
})
export default class ColorStyle extends Vue {
  // Looks like this: { "cartoon": { "color": "spectrum" } }
  @Prop({ required: true }) modelValue!: IStyle;
  @Prop({ required: true }) repName!: string;
  @Prop({ default: true }) allowColorByElement!: boolean;
  @Prop({ default: true }) allowColorCarbons!: boolean;
  @Prop({ default: true }) allowSpectrum!: boolean;
  @Prop({ default: true }) allowSecondaryStructure!: boolean;

  colorStyles = new ColorStyleOptions();

  /**
   * Gets the color form.
   * 
   * @returns {any[]}  The color form.
   */
  get constructedColorForm(): any[] {
    let style: IStyle = this.modelValue;
    let styleAsObjForRef = style as { [key: string]: IColorStyle };

    // If any val is {}, set to default.
    // console.log("*****", styleAsObjForRef[this.repName]);
    if (
      isEqual(styleAsObjForRef[this.repName], {}) ||
      !styleAsObjForRef[this.repName]
    ) {
      // @ts-ignore
      style[this.repName] = this.colorStyles.nameToStyle("Element");
    }

    let colorStyleIdx = this.colorStyles.styleToIndex(
      // @ts-ignore
      style[this.repName]
    );

    // Build the color form

    let colorFormOptions = [];

    if (this.allowColorByElement) {
      colorFormOptions.push({
        description: "Color by Element",
        val: this.colorStyles.nameToIndex("Element"),
      });
    }

    if (this.allowColorCarbons) {
      colorFormOptions.push({
        description: "Color Carbons",
        val: this.colorStyles.nameToIndex("ColorCarbons"),
      });
    }

    if (this.allowSpectrum) {
      colorFormOptions.push({
        description: "Color by Spectrum",
        val: this.colorStyles.nameToIndex("Spectrum"),
      });
    }

    if (this.allowSecondaryStructure) {
      colorFormOptions.push({
        description: "Color by Secondary Structure",
        val: this.colorStyles.nameToIndex("SecondaryStructure"),
      });
    }

    colorFormOptions.push(
      ...[
        {
          description: "Color by Chain",
          val: this.colorStyles.nameToIndex("Chain"),
        },
        {
          description: "Color by Solid",
          val: this.colorStyles.nameToIndex("Solid"),
        },
      ]
    );

    let colorForm: any[] = [
      {
        type: FormElemType.Select,
        varName: "colorscheme",
        val: colorStyleIdx,
        options: colorFormOptions,
      },
    ];

    // If the color scheme is color carbons or solid, add the color option to
    // the form.
    if (
      [
        this.colorStyles.nameToIndex("ColorCarbons"),
        this.colorStyles.nameToIndex("Solid"),
      ].indexOf(colorStyleIdx) > -1
    ) {
      colorForm.push({
        type: FormElemType.Color,
        varName: "color",
        // TODO: Assuming one below. Ok?
        val: this.colorStyles.extractHexColorsFromStyle(style)[0],
      });
    }

    return colorForm;
  }

  /**
   * Get the constructed color form.
   * 
   * @param {any} val  The color form.
   */
  set constructedColorForm(val: any) {
    // Emit something that looks like this:
    // { "cartoon": '{ "color": "spectrum" }' }

    // TODO: Note that below assumes one style [0].
    // let resp: { [key: string]: IColorStyle } = {};

    let resp: { [key: string]: IColorStyle } = { ...this.modelValue };

    let colorschemeIdx = val.filter((v: any) => {
      return v.varName === "colorscheme";
    })[0]?.val;
    let color = val.filter((v: any) => {
      return v.varName === "color";
    })[0]?.val;

    this.colorStyles.color =
      color === undefined ? this.colorStyles.defaultColor : color;
    resp[this.repName] = this.colorStyles.indexToStyle(colorschemeIdx);

    console.log("from color style:", resp);
    this.$emit("update:modelValue", resp);
    this.$emit("onChange");
  }

  /** mounted function */
  mounted() {
    // Start by selecting defaults TODO: Actually, not sure this is necessary.
    // All components will always have SOME style (assigned at load).
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
