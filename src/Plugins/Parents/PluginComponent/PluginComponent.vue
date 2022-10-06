<template>
  <Popup
    :title="title"
    v-model="openToUse"
    :cancelBtnTxt="cancelBtnTxt"
    :actionBtnTxt="actionBtnTxt"
    @onDone="onPopupDone"
    :isActionBtnEnabled="validateUserInputs"
    @onClosed="onClosed"
    :prohibitCancel="prohibitCancel"
    :variant="variant"
  >
    <p v-if="intro !== ''" v-html="intro"></p>
    <slot></slot>
    <FormFull
      ref="formfull"
      v-model="userInputsToUse"
      @onChange="onChange"
    ></FormFull>
  </Popup>
</template>

<script lang="ts">
// Every plugin component must use this component.

import { Options, mixins } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import {
  FormElement,
  IGenericFormElement,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import FormFull from "@/UI/Forms/FormFull/FormFull.vue";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import {
  collapseFormElementArray,
  IUserArg,
} from "@/UI/Forms/FormFull/FormFullUtils";
import { makeMoleculeInput } from "@/UI/Forms/MoleculeInputParams/MakeMoleculeInput";
import { PopupMixin } from "./Mixins/PopupMixin";
import { UserInputsMixin } from "./Mixins/UserInputsMixin";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";

/**
 * PopupOptionalPlugin component
 */
@Options({
  components: {
    Popup,
    FormFull,
  },
})
export default class PluginComponent extends mixins(
  PopupMixin,
  UserInputsMixin
) {
  @Prop({ required: true }) title!: string;
  @Prop({ default: undefined }) isActionBtnEnabled!: boolean;
  @Prop({ required: true }) userInputs!: FormElement[];
  @Prop({ required: true }) intro!: string;
  @Prop({ default: "Load" }) actionBtnTxt!: string;
  @Prop({ default: false }) prohibitCancel!: boolean;
  @Prop({ default: "Cancel" }) cancelBtnTxt!: string;
  @Prop({ default: PopupVariant.PRIMARY }) variant!: PopupVariant;

  /**
   * Determine whether the userData validates (each datum). Children shouldn't
   * override. Override isActionBtnEnabled instead.
   *
   * @returns {boolean} True if all userData validate. False if even one does
   *     not validate.
   */
  get validateUserInputs(): boolean {
    if (this.isActionBtnEnabled !== undefined) {
      return this.isActionBtnEnabled;
    }

    // Using default validation because not specified.
    for (const userInput of this.userInputsToUse) {
      const _userInput = userInput as IGenericFormElement;
      if (
        _userInput.validateFunc !== undefined &&
        !_userInput.validateFunc(_userInput.val)
      ) {
        // Doesn't validate.
        return false;
      }
    }

    return true;
  }

  /**
   * Runs when the user presses the action button and the popup closes.
   */
  onPopupDone() {
    const userParams: IUserArg[] = collapseFormElementArray(
      this.userInputsToUse
    );
    this.$emit("update:modelValue", false);
    // this.closePopup();

    // If one of the user parameters is of type MoleculeInputParams, replace
    // it with IFileInfo objects.
    for (const idx in userParams) {
      const param = userParams[idx];
      if (param.val.combineProteinType) {
        userParams[idx].val = makeMoleculeInput(
          param.val,
          this.$store.state["molecules"]
        );
      }
    }

    this.$emit("onPopupDone", userParams);

    // this.submitJobs([userParams]);
  }

  /**
   * Runs when the user presses the second action button.
   */
  onPopupDone2() {
    this.$emit("onDone2");
  }

  onChange(vals: FormElement[]) {
    const userParams: IUserArg[] = collapseFormElementArray(vals);
    this.$emit("onDataChanged", userParams);
  }

  /**
   * Plugins mounted function.
   */
  mounted() {
    this.setUserInputsToUse(this.userInputs);
    this.openToUse = this.modelValue;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
</style>
