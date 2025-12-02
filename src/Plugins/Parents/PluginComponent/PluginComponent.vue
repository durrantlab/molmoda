<template>
    <Popup v-if="renderInnerPopup" :title="infoPayload.title" v-model="openToUse" :cancelBtnTxt="cancelBtnTxt"
        :cancelBtnClass="cancelBtnClass" :actionBtnTxt="actionBtnTxt" :actionBtnTxt2="actionBtnTxt2"
        :actionBtnTxt3="actionBtnTxt3" :actionBtnTxt4="actionBtnTxt4" :isActionBtnEnabled="validateUserInputs"
        :prohibitCancel="prohibitCancel" :cancelXBtn="cancelXBtn" :variant="variant" @onDone="onPopupDone"
        @onDone2="onPopupDone2" @onDone3="onPopupDone3" @onDone4="onPopupDone4" @onClosed="onClosed"
        @onCancel="onPopupCancel" :id="'modal-' + infoPayload.pluginId" :modalWidth="modalWidth"
        :submitOnEnter="submitOnEnter" :styleBtn1AsCancel="styleBtn1AsCancel">
        <!-- <span v-if="openToUse"> -->
        <!-- :footerTxt="citationTxt" -->
        <p v-if="infoPayload.intro !== ''" v-html="infoPayload.intro +
            ' '
            + (infoPayload.details ? infoPayload.details : '')
            "></p>
        <span v-if="citationsTxt !== ''" v-html="citationsTxt"></span>
        <slot></slot>
        <FormFull ref="formfull" :id="infoPayload.pluginId" v-model="userArgsFixed" @onChange="onChange"
            @onMolCountsChanged="onMolCountsChanged" @onRawValChange="onRawValChange" :hideIfDisabled="hideIfDisabled">
        </FormFull>
        <slot name="afterForm"></slot>
        <!-- </span> -->
    </Popup>
</template>

<script lang="ts">
// Every plugin component must use this component.

import { Options, mixins } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import FormFull from "@/UI/Forms/FormFull/FormFull.vue";
import Popup from "@/UI/MessageAlerts/Popups/Popup.vue";
import { PopupMixin } from "./Mixins/PopupMixin";
import { PopupVariant } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import {
    fixUserArgs,
    convertMoleculeInputParamsToFileInfos,
} from "../UserInputUtils";
import { IInfoPayload } from "@/Plugins/PluginInterfaces";
import { citationsTxt } from "@/Plugins/Citations";
import { logEvent } from "@/Core/Analytics";
import { IProtCmpdCounts } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";

/**
 * PopupOptionalPlugin component
 */
@Options({
    components: {
        Popup,
        FormFull,
    },
})
export default class PluginComponent extends mixins(PopupMixin) {
    /** Whether the action button (e.g., "Load") is enabled. */
    @Prop({ default: undefined }) isActionBtnEnabled!: boolean;

    @Prop({ default: undefined }) modalWidth!: string;

    @Prop({ required: true }) infoPayload!: IInfoPayload;

    /**
     * Whether to hide user parameters that are disabled or to show them in a
     * disabled state.
     */
    @Prop({ default: false }) hideIfDisabled!: boolean;

    /** The text that appears on the action button (e.g., "Load"). */
    @Prop({ default: "Load" }) actionBtnTxt!: string;

    // In rare cases, might need multiple action buttons. Not going to document
    // this for simplicity's sake.
    @Prop({ default: "" }) actionBtnTxt2!: string;
    @Prop({ default: "" }) actionBtnTxt3!: string;
    @Prop({ default: "" }) actionBtnTxt4!: string;

    /**
     * Whether the user can cancel the plugin. Some rare plugins are not
     * cancelable.
     */
    @Prop({ default: false }) prohibitCancel!: boolean;

    /** The text that appears on the cancel button (e.g., "Cancel"). */
    @Prop({ default: "Cancel" }) cancelBtnTxt!: string;
    /**
     * The class to apply to the cancel button. Defaults to 'btn-secondary' (grey button).
     * Use 'btn-link text-decoration-none text-secondary' for a subtle text-only look.
     */
    @Prop({ default: "btn-secondary" }) cancelBtnClass!: string;
    /** Whether to show the X cancel button in the header. */
    @Prop({ default: true }) cancelXBtn!: boolean;
    /**
     * The popup variant (i.e., whether to style the popup as primary, secondary,
     * success, danger, etc.).
     */
    @Prop({ default: PopupVariant.Primary }) variant!: PopupVariant;

    /**
     * Whether pressing enter will submit the plugin. Almost always true
     * (default).
     */
    @Prop({ default: true }) submitOnEnter!: boolean;

    /**
     * Whether to style action button 2 as the cancel button. It's still an
     * action button, but it's sometimes helpful to make it the same color as
     * cancel for consistency's sake.
     */
    @Prop({ default: false }) styleBtn1AsCancel!: boolean;

    /**
     * The user arguments (i.e., plugin parameters) to use.
     *
     * @returns {UserArg[]} The user arguments (i.e., plugin parameters) to use.
     */
    get userArgsFixed(): UserArg[] {
        return fixUserArgs(this.infoPayload.userArgs);
    }

    /**
     * Sets the user arguments (i.e., plugin parameters) that should be used.
     *
     * @param {UserArg[]} val  The user arguments (i.e., plugin parameters).
     */
    set userArgsFixed(val: UserArg[]) {
        this.onChange(val);
    }

    /**
     * Get multiple citations as a string.
     *
     * @returns {string} The citations as a string.
     */
    get citationsTxt(): string {
        return citationsTxt(this.infoPayload);
    }

    /**
     * Determine whether the userData validates (each datum). Children shouldn't
     * override. Override isActionBtnEnabled instead.
     *
     * @returns {boolean} True if all userData validate. False if even one does
     *     not validate.
     */
    get validateUserInputs(): boolean {
        // If isActionBtnEnabled is defined on the plugin, it overrides any
        // validation.
        if (this.isActionBtnEnabled !== undefined) {
            return this.isActionBtnEnabled;
        }

        // Using default validation because not specified.
        for (const userArg of this.userArgsFixed) {
            const _userInput = userArg;
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
     * Runs when the molecule counts change, as specified when using the
     * MoleculeInputParams component.
     *
     * @param {IProtCmpdCounts} val  The molecule counts.
     */
    onMolCountsChanged(val: IProtCmpdCounts) {
        // Runs when the molecule counts change.
        this.$emit("onMolCountsChanged", val);
    }

    /**
     * Runs when the raw value of a user argument changes. emits the
     * onRawValChange event.
     *
     * @param {string} id  The ID of the user argument.
     * @param {string} val  The new value for the user argument.
     */
    onRawValChange(id: string, val: string) {
        this.$emit("onRawValChange", id, val);
    }

    /**
     * Runs when the user clicks the cancel button.
     */
    onPopupCancel() {
        // Log plugin started
        if (this.infoPayload.logAnalytics !== false) {
            logEvent(this.infoPayload.pluginId, "cancelled");
        }

        this.$emit("update:modelValue", false);
        this.$emit("onPopupCancel");
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    async onPopupDone() {
        // Close the popup
        this.$emit("update:modelValue", false);
        // this.closePopup();

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await convertMoleculeInputParamsToFileInfos(this.infoPayload.userArgs);

        this.$emit("onPopupDone");
    }

    /**
     * Runs when the user presses the second action button and the popup closes.
     */
    onPopupDone2() {
        // this.$emit("update:modelValue", false);

        /**
         * Runs when the secondary action button is pressed, after the popup closes.
         */
        this.$emit("onPopupDone2");
    }

    /**
     * Runs when the user presses the third action button and the popup closes.
     */
    onPopupDone3() {
        // this.$emit("update:modelValue", false);
        this.$emit("onPopupDone3");
    }

    /**
     * Runs when the user presses the forth action button and the popup closes.
     */
    onPopupDone4() {
        // this.$emit("update:modelValue", false);
        this.$emit("onPopupDone4");
    }

    /**
     * Runs when the user data changes.
     *
     * @param {UserArg[]} userArgsFixed  The user arguments (i.e., plugin
     *                                   parameters).
     */
    onChange(userArgsFixed: UserArg[]) {
        // Runs when the user changes any user arguments (plugin parameters).
        this.$emit("onUserArgChanged", this.userArgsFixed);
    }

    // Listen to userArgs and update userArgsFixed.
    // @Watch("userArgs")
    // onUserArgsChanged() {
    //     this.setUserInputsToUse(this.userArgs);
    // }

    /**
     * Plugins mounted function.
     */
    mounted() {
        // this.setUserInputsToUse(this.userArgs);
        this.openToUse = this.modelValue;
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss"></style>
