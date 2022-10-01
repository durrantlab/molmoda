<template>
  <PopupPluginParent
    :title="title"
    v-model="openToUse"
    cancelBtnTxt="Cancel"
    actionBtnTxt="Run"
    @onDone="_onPopupDone"
    :isActionBtnEnabled="isActionBtnEnabled"
    @onClosed="onClosed"
  >
    <p v-if="intro !== ''" v-html="intro"></p>
    <FormFull v-model="userInputsToUse"></FormFull>
  </PopupPluginParent>
  <!-- <Popup> </Popup> -->
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import {
  collapseFormElementArray,
  IUserArg,
} from "@/UI/Forms/FormFull/FormFullUtils";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import FormFull from "@/UI/Forms/FormFull/FormFull.vue";
import PopupPluginParent from "../PopupPluginParent/PopupPluginParent.vue";
import { OptionalPluginParentRenderless } from "./OptionalPluginParentRenderless";
import { IContributorCredit, ISoftwareCredit } from "@/Plugins/PluginInterfaces";
import { RunJobReturn } from "../PluginParent/PluginParentRenderless";

/**
 * PopupOptionalPlugin component
 */
@Options({
  components: {
    PopupPluginParent,
    FormFull,
  },
})
export default class OptionalPluginParent extends OptionalPluginParentRenderless {
  // @Prop({ required: true }) modelValue!: any; // open
  @Prop({ required: true }) title!: string;
  @Prop({ default: true }) isActionBtnEnabled!: boolean;
  @Prop({ required: true }) userInputs!: FormElement[];
  // @Prop({ default: "" }) intro!: string;

  // Per PluginParentRenderless, must define. Children should redefine.
  menuPath: string[] | string | null  = "";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [];
  pluginId = "";
  onPluginStart(payload: any) { return; }
  runJob(parameters: any): RunJobReturn { return undefined; }

  // Per PopupPluginParentRenderless, must define. Children should redefine.
  intro = "";
  beforePopupOpen() { return; }
  onPopupDone(userInput?: any) { return; }


  /**
   * Watches the modelValue variable.
   *
   * @param {boolean} newValue  The new value of the open variable.
   */
  @Watch("modelValue")
  onModelValueChange(newValue: boolean) {
    this.openToUse = newValue;
  }

  /** mounted function */
  mounted() {
    // Make a copy of user inputs so you can use with v-model. So not reactive
    // in parent.
    this.userInputsToUse = this.userInputs;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
</style>
