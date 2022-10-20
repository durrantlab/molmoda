<template>
  <div class="ms-2" style="margin-top: -8px">
    <FormFull v-model="constructedColorForm" id="color-style"></FormFull>
    <!-- :hideIfDisabled="true" -->
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

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import isEqual from "lodash.isequal";

import {
FormElement,
  FormElemType,
  IFormOption,
  IFormSelect,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ColorOptions } from "./ColorOptions";

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
export default class ColorSelect extends Vue {
  // Looks like this: { "cartoon": { "color": "spectrum" } }
  @Prop({ required: true }) modelValue!: IStyle;
  @Prop({ required: true }) repName!: string;
  @Prop({ default: true }) allowColorByElement!: boolean;
  @Prop({ default: true }) allowColorCarbons!: boolean;
  @Prop({ default: true }) allowSpectrum!: boolean;
  @Prop({ default: true }) allowSecondaryStructure!: boolean;

  colorStyles = new ColorOptions();

  /**
   * Add default values to the style object if it is missing. Acts in place, so
   * returns nothing.
   *
   * @param {IStyle} style  The style. Looks something like
   *                        {"cartoon":{"color":"spectrum"}}.
   */
  private _setColorStyleDefaults(style: IStyle) {
    // If the value (IColorStyle) of style is {}, set to default color scheme.
    let styleAsObjForRef = style as { [key: string]: IColorStyle };

    if (
      isEqual(styleAsObjForRef[this.repName], {}) ||
      !styleAsObjForRef[this.repName]
    ) {
      const colorStyleName =
        this.repName === "cartoon" ? "Spectrum" : "Element";

      // @ts-ignore
      style[this.repName] = this.colorStyles.nameToStyle(colorStyleName);
    }
  }

  private _getColorOptionsForSelect(): IFormOption[] {
    let colorFormOptions: IFormOption[] = [];

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

    return colorFormOptions;
  }

  /**
   * Gets the color form.
   *
   * @returns {any[]}  The color form.
   */
  get constructedColorForm(): any[] {
    let style: IStyle = this.modelValue;
    // `style` looks like {"cartoon":{"color":"spectrum"}}

    this._setColorStyleDefaults(style);

    // Get the available color-form options.
    const colorFormOptions = this._getColorOptionsForSelect();

    // Make the select
    let colorStyleIdx = this.colorStyles.styleToIndex(
      // @ts-ignore
      style[this.repName]
    );

    const colorFormSelect = {
      type: FormElemType.Select,
      id: "colorscheme",
      val: colorStyleIdx.toString(),
      options: colorFormOptions,
    } as IFormSelect;

    let colorForm: FormElement[] = [colorFormSelect];

    // If the color scheme is color carbons or solid, add the color option to
    // the color form.
    if (
      [
        this.colorStyles.nameToIndex("ColorCarbons"),
        this.colorStyles.nameToIndex("Solid"),
      ].indexOf(colorStyleIdx) > -1
    ) {
      colorForm.push({
        type: FormElemType.Color,
        id: "color",
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
