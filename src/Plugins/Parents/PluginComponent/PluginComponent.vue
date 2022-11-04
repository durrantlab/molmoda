<template>
  <Popup
    :title="title"
    v-model="openToUse"
    :cancelBtnTxt="cancelBtnTxt"
    :actionBtnTxt="actionBtnTxt"
    :isActionBtnEnabled="validateUserInputs"
    :prohibitCancel="prohibitCancel"
    :variant="variant"
    @onDone="onPopupDone"
    @onDone2="onPopupDone2"
    @onClosed="onClosed"
    :id="'modal-' + pluginId"
  >
    <p v-if="intro !== ''" v-html="intro"></p>
    <slot></slot>
    <FormFull
      ref="formfull"
      :id="pluginId"
      v-model="userArgsToUse"
      @onChange="onChange"
      :hideIfDisabled="hideIfDisabled"
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
import { IFileInfo } from "@/FileSystem/Types";

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
  /** Title of the popup. */
  @Prop({ required: true }) title!: string;

  /** The user arguments (plugin parameters) that the end user can specify. */
  @Prop({ required: true }) userArgs!: FormElement[];

  /** A unique id that defines the plugin. Must be lower case. */
  @Prop({ required: true }) pluginId!: string;

  /** Whether the action button (e.g., "Load") is enabled. */
  @Prop({ default: undefined }) isActionBtnEnabled!: boolean;

  /** 
   * Whether to hide user parameters that are disabled or to show them in a
   * disabled state. 
   */
  @Prop({ default: false }) hideIfDisabled!: boolean;

  /**
   * Introductory text that appears at the top of the plugin (above the user
   * inputs).
   */
  @Prop({ default: "" }) intro!: string;

  /** The text that appears on the action button (e.g., "Load"). */
  @Prop({ default: "Load" }) actionBtnTxt!: string;

  /**
   * Whether the user can cancel the plugin. Some rare plugins are not
   * cancelable.
   */
  @Prop({ default: false }) prohibitCancel!: boolean;

  /** The text that appears on the cancel button (e.g., "Cancel"). */
  @Prop({ default: "Cancel" }) cancelBtnTxt!: string;

  /**
   * The popup variant (i.e., whether to style the popup as primary, secondary,
   * success, danger, etc.).
   */
  @Prop({ default: PopupVariant.Primary }) variant!: PopupVariant;

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
    for (const userArg of this.userArgsToUse) {
      const _userInput = userArg as IGenericFormElement;
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
    const userArgs: IUserArg[] = collapseFormElementArray(this.userArgsToUse);
    this.$emit("update:modelValue", false);
    // this.closePopup();

    // If one of the user arguments is of type MoleculeInputParams, replace
    // it with IFileInfo objects.
    let combineIdxs: number[] = [];
    let combinePromises: Promise<IFileInfo[][]>[] = [];
    for (const idx in userArgs) {
      const param = userArgs[idx];
      if (param.val.combineProteinType) {
        combineIdxs.push(parseInt(idx));
        combinePromises.push(
          makeMoleculeInput(param.val, this.$store.state["molecules"])
        );
      }
    }

    Promise.all(combinePromises)
      .then((combinedMols: IFileInfo[][][]) => {
        for (let idx = 0; idx < combineIdxs.length; idx++) {
          let i = combineIdxs[idx];
          userArgs[i].val = combinedMols[idx];
        }

        /**
         * Runs when the primary action button is pressed, after the popup closes.
         *
         * @param {IUserArg[]} userArgs  The specified user arguments.
         */
        this.$emit("onPopupDone", userArgs);

        return;
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  }

  /**
   * Runs when the user presses the second action button and the popup closes.
   */
  onPopupDone2() {
    this.$emit("update:modelValue", false);

    /**
     * Runs when the secondary action button is pressed, after the popup closes.
     */
    this.$emit("onPopupDone2");
  }

  /**
   * Runs when the user data changes.
   *
   * @param {FormElement[]} vals  The updated values.
   */
  onChange(vals: FormElement[]) {
    const userArgs: IUserArg[] = collapseFormElementArray(vals);

    /**
     * Runs when the user changes any user arguments (plugin parameters).
     *
     * @param {IUserArg[]} userArgs  The updated user arguments.
     */
    this.$emit("onDataChanged", userArgs);
  }

  /**
   * Plugins mounted function.
   */
  mounted() {
    this.setUserInputsToUse(this.userArgs);
    this.openToUse = this.modelValue;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
</style>
