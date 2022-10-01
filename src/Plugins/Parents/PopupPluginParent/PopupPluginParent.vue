<template>
  <Popup
    :title="title"
    v-model="open"
    :cancelBtnTxt="cancelBtnTxt"
    :actionBtnTxt="actionBtnTxt"
    @onDone="onPopupDone"
    :isActionBtnEnabled="isActionBtnEnabled"
    :actionBtnTxt2="actionBtnTxt2"
    @onDone2="onPopupDone2"
    @onClosed="onClosed"
    :onShown="_onShown"
    :beforeShown="_beforeShown"
  >
    <slot></slot>
  </Popup>
</template>

<script lang="ts">
// eslint-disable @typescript-eslint/ban-types

import { IContributorCredit, ISoftwareCredit } from "@/Plugins/PluginInterfaces";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { Options } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import { RunJobReturn } from "../PluginParent/PluginParentRenderless";
import { PopupPluginParentRenderless } from "./PopupPluginParentRenderless";

/**
 * SimpleMsgPlugin
 */
@Options({
  components: {
    Popup,
  },
})
export default class PopupPluginParent extends PopupPluginParentRenderless { 
  @Prop({ required: true }) modelValue!: any;
  @Prop({ default: "My Title" }) title!: string;
  @Prop() cancelBtnTxt!: string; // If undefined, no cancel button
  @Prop() actionBtnTxt!: string; // If undefined, no ok button
  @Prop({ default: "" }) actionBtnTxt2!: string; // If undefined, no ok button
  // @Prop({ default: true }) cancelXBtn!: boolean;
  @Prop({ default: true }) isActionBtnEnabled!: boolean;
  // @Prop({ default: false }) prohibitCancel!: boolean;
  // @Prop({ default: PopupVariant.PRIMARY }) variant!: PopupVariant;

  // eslint-disable-next-line @typescript-eslint/ban-types
  @Prop({}) onShown!: Function;
  // eslint-disable-next-line @typescript-eslint/ban-types
  @Prop({}) beforeShown!: Function;

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

  @Watch("modelValue")
  onModelValueChange() {
    this.open = this.modelValue;
  }

  @Watch("open")
  onOpenChange() {
    this.$emit("update:modelValue", this.open);
  }

  _onShown() {
    this.$emit("onShown");
  }
  _beforeShown() {
    this.$emit("beforeShown");
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

