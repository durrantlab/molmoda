<template>
  <Popup
    :title="title"
    v-model="open"
    cancelBtnTxt="Cancel"
    :actionBtnTxt="actionBtnTxt"
    @onDone="onDone"
    :isActionBtnEnabled="isActionBtnEnabled"
    :onShown="onPopupShown"
    :beforeShown="beforePopupShown"
    :prohibitCancel="prohibitCancel"
  >
    <p v-if="intro !== ''" v-html="intro"></p>
    <FormInput
      ref="formInput"
      v-model="textVal"
      :placeHolder="placeHolder"
      :filterFunc="filterFunc"
      @onChange="onTextChange"
    ></FormInput>
    <slot></slot>
  </Popup>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import Popup from "@/UI/Layout/Popups/Popup.vue";
import { Options, Vue } from "vue-class-component";
import FormInput from "@/UI/Forms/FormInput.vue";
import { Prop, Watch } from "vue-property-decorator";

/**
 * Simply returns the input string, without any filtering.
 * 
 * @param {string} str The input string.
 * @returns {string} The input string.
 */
function _neverFilter(str: string): string {
  return str;
}

@Options({
  components: {
    Popup,
    FormInput,
  },
})
export default class PopupOneTextInput extends Vue {
  @Prop({ required: true }) openValue!: any;
  @Prop({ required: true }) title!: string;
  @Prop({ default: "" }) intro!: string;
  @Prop({ default: "" }) placeHolder!: string;
  // @Prop({ default: "Cancel" }) cancelBtnTxt!: string; // If undefined, no cancel button
  @Prop({ default: "Load" }) actionBtnTxt!: string; // If undefined, no ok button
  @Prop({ default: true }) isActionBtnEnabled!: boolean;
  @Prop({ default: _neverFilter }) filterFunc!: Function;
  @Prop({ default: false }) prohibitCancel!: boolean;
  @Prop({ default: "" }) text!: string;

  textVal = "";

  get open(): boolean {
    return this.openValue;
  }

  set open(val: boolean) {
    this.$emit("update:openValue", val);
  }

  onTextChange() {
    this.$emit("update:text", this.textVal);
  }

  onDone(): void {
    if (this.textVal === undefined) {
      return;
    }
    this.open = false;
    this.$emit("onTextDone", this.textVal);
  }

  beforePopupShown() {
    this.textVal = this.text;
  }

  onPopupShown() {
    let focusTarget = (this.$refs.formInput as any).$refs
      .inputElem as HTMLInputElement;
    focusTarget.focus();
  }

  @Watch("defaultVal")
  onDefaultValChange(newVal: string) {
    this.textVal = newVal;
  }
}
</script>

<style scoped lang="scss"></style>
