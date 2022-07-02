<template>
  <FormFull v-model="constructedColorForm"></FormFull>

  <!-- {{colorForm}} -->
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import Section from "@/UI/Layout/Section.vue";
import FormSelect from "@/UI/Forms/FormSelect.vue";

// @ts-ignore
import IconSwitcher from "@/UI/Navigation/TitleBar/IconBar/IconSwitcher.vue";
import FormFull, { FormElemType } from "@/UI/Forms/FormFull.vue";
import { IStyle } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { isEqual } from "lodash";

export enum ColorStyleOptions {
  Element = '{"colorscheme": "default"}',
  ColorCarbons = '{"colorscheme": "#HEX>Carbon"}',
  Spectrum = '{"color": "spectrum"}',
  SecondaryStructure = '{"colorscheme": "ssPyMOL"}',
  Chain = '{"colorscheme": "chain"}',
  Solid = '{"color": "#HEX"}',
}

@Options({
  components: {
    Section,
    FormSelect,
    IconSwitcher,
    FormFull,
  },
})
export default class ColorStyle extends Vue {
  // Looks like this: { "cartoon": { "color": "spectrum" } }
  @Prop({ required: true }) modelValue!: IStyle;

  representationName: string = "";

  get constructedColorForm(): any[] {
    let selectedColorScheme: IStyle = this.modelValue;

    // If any val is {}, set to default.
    for (let styleType in selectedColorScheme) {
      // @ts-ignore
      if (isEqual(selectedColorScheme[styleType], {})) {
        // @ts-ignore
        selectedColorScheme[styleType] = ColorStyleOptions.Element;
      }
    }

    // Get the color form for the selected color scheme. TODO: Assuming only one
    // styling per selection.
    this.representationName = Object.keys(selectedColorScheme)[0];

    // @ts-ignore
    let firstStyleColor = selectedColorScheme[this.representationName];

    let colorForm: any[] = [
      {
        type: FormElemType.Select,
        varName: "colorscheme",
        val: firstStyleColor,
        options: [
          { description: "Color by Element", val: ColorStyleOptions.Element },
          {
            description: "Color Carbons",
            val: ColorStyleOptions.ColorCarbons,
          },
          {
            description: "Color by Spectrum",
            val: ColorStyleOptions.Spectrum,
          },
          {
            description: "Color by Secondary Structure",
            val: ColorStyleOptions.SecondaryStructure,
          },
          { description: "Color by Chain", val: ColorStyleOptions.Chain },
          { description: "Color by Solid", val: ColorStyleOptions.Solid },
        ],
      },
    ];

    console.log(ColorStyleOptions.ColorCarbons, ColorStyleOptions.Solid, firstStyleColor);
    if (
      [ColorStyleOptions.ColorCarbons, ColorStyleOptions.Solid].indexOf(firstStyleColor) >
      -1
    ) {
      colorForm.push({
        type: FormElemType.Color,
        varName: "color",
        val: "#FF0000",
      });
    }

    return colorForm;
  }

  set constructedColorForm(val: any) {
    // Emit something that looks like this:
    // { "cartoon": '{ "color": "spectrum" }' }

    // TODO: Note that below assumes only one style [0].
    let resp = {};
    // @ts-ignore
    resp[this.representationName] = val[0].val;
    this.$emit("update:modelValue", resp);
  }

  mounted() {
    // Start by selecting defaults TODO: Actually, not sure this is necessary.
    // All components will always have SOME style (assigned at load).
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
