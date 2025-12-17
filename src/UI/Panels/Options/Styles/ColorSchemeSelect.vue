<template>
  <div :class="cls">
 <FormFull v-model="constructedColorForm" id="colorscheme-form" spacing="0"></FormFull>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import Section from "@/UI/Layout/Section.vue";
import FormSelect from "@/UI/Forms/FormSelect.vue";

import FormFull from "@/UI/Forms/FormFull/FormFull.vue";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import isEqual from "lodash.isequal";

import {
  UserArg,
  UserArgType,
  IUserArgSelect,
  IUserArgColor
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ISelAndStyle, Representation } from "@/Core/Styling/SelAndStyleInterfaces";
import { IColorScheme } from "@/Core/Styling/Colors/ColorInterfaces";
import { ColorSchemeOptionsForSelect, defaultColor } from "@/UI/Panels/Options/Styles/ColorSchemeOptionsForSelect";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { colorDefinitionIndexToName, colorDefinitionNameToIndex, colorSchemeToDefinitionIndex } from "@/Core/Styling/Colors/ColorSchemeDefinitions";

/**
 * ColorSchemeSelect component. This is just to select the color style for a
 * single molecular type (e.g., protein) and representation (e.g., surface). The
 * same component gets used separately for each representation, for each
 * molecule type. See StylesForMolType component.
 */
@Options({
  components: {
    Section,
    FormSelect,
    FormFull,
  },
  emits: { onChange: "onChange", "update:modelValue": "update:modelValue" },
})
export default class ColorSchemeSelect extends Vue {
  // Looks like this: { "cartoon": { "color": "spectrum" } }
  @Prop({ required: true }) modelValue!: ISelAndStyle;
  @Prop({ required: true }) repName!: Representation;
  @Prop({ required: true }) molType!: TreeNodeType;
  @Prop({ default: "ms-2" }) cls!: string;
  @Prop({ type: Array, default: () => [] }) excludeSchemeNames!: string[];

  colorSchemeOptionsForSelect = new ColorSchemeOptionsForSelect();

  /**
   * Gets the color form.
   *
   * @returns {any[]}  The color form.
   */
  get constructedColorForm(): any[] {
    let style: ISelAndStyle = this.modelValue;
    // `style` looks like {"cartoon":{"color":"spectrum"}}

    this._setColorSchemeDefaultsIfMissing(style);

    // Get the available color-form options.
    let colorSchemeOptions = this.colorSchemeOptionsForSelect.createColorSchemeOptionsForSelect(
      this.repName,
      this.molType
    );

    // Filter out excluded scheme names
    if (this.excludeSchemeNames && this.excludeSchemeNames.length > 0) {
      colorSchemeOptions = colorSchemeOptions.filter(option => {
        const schemeName = colorDefinitionIndexToName(Number(option.val));
        return !this.excludeSchemeNames.includes(schemeName);
      });
    }

    const rawColorScheme = (style as any)[this.repName];
    // Create a "clean" version of the color scheme for matching, excluding properties
    // like 'radius' that are not part of the base definition.
    const cleanColorScheme: IColorScheme = {};
    if (rawColorScheme && rawColorScheme.color) {
      cleanColorScheme.color = rawColorScheme.color;
    }
    if (rawColorScheme && rawColorScheme.colorscheme) {
      cleanColorScheme.colorscheme = rawColorScheme.colorscheme;
    }

    // Get the index in the options list of the current color style.
    let colorSchemeIdx = colorSchemeToDefinitionIndex(cleanColorScheme);

    // Create the color form select object.
    const colorFormSelect = {
      type: UserArgType.Select,
      id: "colorscheme",
      val: colorSchemeIdx.toString(),   // Current color style index as a string
      options: colorSchemeOptions,  // Options for the select dropdown
    } as IUserArgSelect;

    // Make the form
    let colorForm: UserArg[] = [colorFormSelect];

    // If the color scheme is color carbons or solid, add the color option to
    // the color form (to select the specific color).
    if (
      [
        colorDefinitionNameToIndex("ColorCarbons"),
        colorDefinitionNameToIndex("Solid"),
      ].indexOf(colorSchemeIdx) > -1
    ) {
      colorForm.push({
        type: UserArgType.Color,
        id: "color",
        val: this.colorSchemeOptionsForSelect.extractHexColorsFromStyle(style)[0],
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
    let style: ISelAndStyle = { ...this.modelValue };

    // Make sure the colorSchemes color is set. If not, set it to the default
    // color.
    let color = (
      val.filter((v: any) => {
        return v.id === "color";
      })[0] as IUserArgColor
    )?.val;
    this.colorSchemeOptionsForSelect.color =
      color === undefined ? defaultColor : color;

    // Replace the color style with an appropriate one given the color.
    let colorschemeIdx = (
      val.filter((v: any) => {
        return v.id === "colorscheme";
      })[0] as IUserArgColor
    )?.val;

    (style as any)[this.repName] = this.colorSchemeOptionsForSelect.colorDefinitionIndexToScheme(
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
   * @param {ISelAndStyle} style  The style. Looks something like
   *                        {"cartoon":{"color":"spectrum"}}.
   */
  private _setColorSchemeDefaultsIfMissing(style: ISelAndStyle) {
    // If the value (IColorScheme) of style is {}, set to default color scheme.

    // If it's sticks, you should remove the radius. This is because radius
    // varies depending on molecule type (protein vs. compound). Make deep
    // copy of style.
    let styleAsObjForRef: { [key: string]: IColorScheme };
    try {
      styleAsObjForRef = JSON.parse(JSON.stringify(style)) as {
        [key: string]: IColorScheme;
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
      const colorSchemeName =
        this.repName === "cartoon" ? "Spectrum" : "Element";

      (style as any)[this.repName] =
        this.colorSchemeOptionsForSelect.colorDefinitionNameToScheme(colorSchemeName);
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
