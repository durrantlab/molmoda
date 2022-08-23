<template>
  <Popup
    :title="title"
    v-model="open"
    cancelBtnTxt="Cancel"
    :actionBtnTxt="actionBtnTxt"
    @onDone="onDone"
    :actionBtnEnabled="isActionBtnEnabled(val)"
    :onShown="onPopupShown"
  >
    <p v-if="intro !== ''" v-html="intro"></p>
    <FormInput
      ref="formInput"
      v-model="val"
      :placeHolder="placeHolder"
      :filterFunc="filterFunc"
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

function _alwaysTrue(): boolean {
  return true;
}

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
  @Prop({ required: true }) modelValue!: any;
  @Prop({ required: true }) title!: string;
  @Prop({ default: "" }) intro!: string;
  @Prop({ default: "" }) placeHolder!: string;
  // @Prop({ default: "Cancel" }) cancelBtnTxt!: string; // If undefined, no cancel button
  @Prop({ default: "Load" }) actionBtnTxt!: string; // If undefined, no ok button
  @Prop({ default: _alwaysTrue }) isActionBtnEnabled!: Function;
  @Prop({ default: _neverFilter }) filterFunc!: Function;
  @Prop({ default: "" }) defaultVal!: string;

  val = "";

  get open(): boolean {
    return this.modelValue;
  }

  set open(val: boolean) {
    this.$emit("update:modelValue", val);
  }

  onDone(): void {
    if (this.val === undefined) {
      return;
    }
    this.open = false;
    this.$emit("onTextDone", this.val);
  }

  onPopupShown() {
    this.val = this.defaultVal;
    let focusTarget = (this.$refs.formInput as any).$refs
      .inputElem as HTMLInputElement;
    focusTarget.focus();
  }

  @Watch("defaultVal")
  onDefaultValChange(newVal: string) {
    this.val = newVal;
  }
}
</script>

<style scoped lang="scss"></style>
