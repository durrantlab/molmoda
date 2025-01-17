<template>
  <div class="ms-2">
    <FormFull
      v-model="constructedColorForm"
      id="color-style"
      spacing="0"
    ></FormFull>
  </div>
</template>

<script lang="ts">
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
  UserArg,
  UserArgType,
  IUserArgOption,
  IUserArgSelect,
  IUserArgColor,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ColorOptions } from "./ColorOptions";

/**
 * ColorSelect component
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
   * Gets the color form.
   *
   * @returns {any[]}  The color form.
   */
  get constructedColorForm(): any[] {
    let style: IStyle = this.modelValue;
    // `style` looks like {"cartoon":{"color":"spectrum"}}

    this._setColorStyleDefaultsIfMissing(style);

    // Get the available color-form options.
    const colorFormOptionsForSelect = this._getColorOptionsForSelect();

    // Make the select
    let colorStyleIdx = this.colorStyles.styleToIndex(
      (style as any)[this.repName]
    );

    const colorFormSelect = {
      type: UserArgType.Select,
      id: "colorscheme",
      val: colorStyleIdx.toString(),
      options: colorFormOptionsForSelect,
    } as IUserArgSelect;

    // Make the form
    let colorForm: UserArg[] = [colorFormSelect];

    // If the color scheme is color carbons or solid, add the color option to
    // the color form.
    if (
      [
        this.colorStyles.nameToIndex("ColorCarbons"),
        this.colorStyles.nameToIndex("Solid"),
      ].indexOf(colorStyleIdx) > -1
    ) {
      colorForm.push({
        type: UserArgType.Color,
        id: "color",
        val: this.colorStyles.extractHexColorsFromStyle(style)[0],
      });
    }

    return colorForm;
  }

  /**
   * Get the constructed color form.
   *
   * @param {UserArg[]} val  The color form.
   */
  set constructedColorForm(val: UserArg[]) {
    // Emit something that looks like this:
    // { "cartoon": '{ "color": "spectrum" }' }

    // Copy the representations from the component.
    let style: IStyle = { ...this.modelValue };

    // Make sure the colorStyles color is set. If not, set it to the default
    // color.
    let color = (
      val.filter((v: any) => {
        return v.id === "color";
      })[0] as IUserArgColor
    )?.val;
    this.colorStyles.color =
      color === undefined ? this.colorStyles.defaultColor : color;

    // Replace the color style with an appropriate one given the color.
    let colorschemeIdx = (
      val.filter((v: any) => {
        return v.id === "colorscheme";
      })[0] as IUserArgColor
    )?.val;
    (style as any)[this.repName] = this.colorStyles.indexToStyle(
      parseInt(colorschemeIdx)
    );

    // console.log("from color style:", reps);
    this.$emit("update:modelValue", style);
    this.$emit("onChange");
  }

  /**
   * Add default values to the style object if it is missing. Acts in place, so
   * returns nothing.
   *
   * @param {IStyle} style  The style. Looks something like
   *                        {"cartoon":{"color":"spectrum"}}.
   */
  private _setColorStyleDefaultsIfMissing(style: IStyle) {
    // If the value (IColorStyle) of style is {}, set to default color scheme.

    // If it's sticks, you should remove the radius. This is because radius
    // varies depending on molecule type (protein vs. compound). Make deep
    // copy of style.
    let styleAsObjForRef: { [key: string]: IColorStyle };
    try {
      styleAsObjForRef = JSON.parse(JSON.stringify(style)) as {
        [key: string]: IColorStyle;
      };
    } catch (e) {
      debugger;
      return;
    }

    // remove radius if it's there
    if (
      styleAsObjForRef["stick"] &&
      styleAsObjForRef["stick"]["radius"] !== undefined
    )
      delete styleAsObjForRef["stick"]["radius"];

    if (
      isEqual(styleAsObjForRef[this.repName], {}) ||
      !styleAsObjForRef[this.repName]
    ) {
      const colorStyleName =
        this.repName === "cartoon" ? "Spectrum" : "Element";

      (style as any)[this.repName] =
        this.colorStyles.nameToStyle(colorStyleName);
    }
  }

  /**
   * Color options (e.g., Color by Element) are presented as a select box. This
   * gets the appropriate options for that box.
   *
   * @returns {IUserArgOption[]}  The options for the color-style select box.
   */
  private _getColorOptionsForSelect(): IUserArgOption[] {
    let colorFormOptions: IUserArgOption[] = [];

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
          description: "Color by Molecule",
          val: this.colorStyles.nameToIndex("Molecule"),
        },
        {
          description: "Color by Solid",
          val: this.colorStyles.nameToIndex("Solid"),
        },
      ]
    );

    return colorFormOptions;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
