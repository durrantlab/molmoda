<template>
  <Popup
    :title="title"
    v-model="openToUse"
    cancelBtnTxt="Cancel"
    actionBtnTxt="Run"
    @onDone="onPopupDone"
    :actionBtnEnabled="actionBtnEnabled"
  >
    <p v-if="intro !== ''" v-html="intro"></p>
    <FormFull v-model="userInputsToUse"></FormFull>
    <CombineProteins></CombineProteins>
  </Popup>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import {
  collapseFormElementArray,
  IUserArg,
} from "@/UI/Forms/FormFull/FormFullUtils";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import FormFull from "@/UI/Forms/FormFull/FormFull.vue";
import CombineProteins from "@/UI/Forms/CombineProteins.vue";

@Options({
  components: {
    Popup,
    FormFull,
    CombineProteins
  },
})
export default class PopupOptionalPlugin extends Vue {
  @Prop({ required: true }) userInputs!: FormElement[];
  @Prop({ required: true }) open!: boolean;
  @Prop({ required: true }) title!: string;
  @Prop({ default: true }) actionBtnEnabled!: boolean;
  @Prop({ default: "" }) intro!: string;

  openToUse = false;
  userInputsToUse: FormElement[] = [];

  @Watch("open")
  onOpenChange(newValue: boolean) {
    this.openToUse = newValue;
  }

  onPopupDone() {
    const userParams: IUserArg[] = collapseFormElementArray(this.userInputs);
    this.$emit("onPopupDone", userParams);
  }

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
