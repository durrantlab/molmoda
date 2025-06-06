<template>
    <span>
        <div class="input-group">
            <input ref="inputElem" :type="type" :class="'form-control form-control-sm' +
                (type === 'color' ? ' form-control-color' : '') +
                (type === 'range' ? ' form-range border-0 shadow-none' : '')
                " :id="id" :placeholder="placeHolder" :disabled="disabled" @input="handleInput" @keydown="onKeyDown"
                :value="modelValue" :min="min" :max="max" :step="step" />
            <div v-if="actionBtnTxt !== undefined" class="input-group-append">
                <button @click="onActionBtnClick" class="btn btn-primary" type="button">
                    {{ actionBtnTxt }}
                </button>
            </div>
        </div>
        <FormElementDescription :description="descriptionToUse" :validate="validateDescription" :warning="warning">
        </FormElementDescription>
        <!-- :disabled="!isActionBtnEnabled || isClosing"
        @click="actionBtn" -->
        <!-- <button type="button" class="btn btn-primary action-btn">TEST</button> -->
    </span>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { randomID } from "@/Core/Utils/MiscUtils";
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import FormElementDescription from "@/UI/Forms/FormElementDescription.vue";
import { formInputDelayUpdate } from "@/Core/GlobalVars";

/**
 * FormInput component
 */
@Options({
    components: {
        FormElementDescription,
    },
})
export default class FormInput extends Vue {
    @Prop({ required: true }) modelValue!: any;
    @Prop({ default: randomID() }) id!: string;
    @Prop({ default: "text" }) type!: string;
    @Prop({ default: "Enter value..." }) placeHolder!: string;
    @Prop({ default: false }) disabled!: boolean;
    @Prop({ required: false }) filterFunc!: (val: any) => boolean;
    @Prop({ required: false }) warningFunc!: (val: any) => string;
    @Prop({}) description!: string;
    @Prop({ default: formInputDelayUpdate })
    delayBetweenChangesDetected!: number;
    @Prop({ default: true }) validateDescription!: boolean;
    @Prop({ default: undefined }) actionBtnTxt!: string; // If undefined, no action button button

    // Below used for range.
    @Prop({ default: undefined }) min!: number;
    @Prop({ default: undefined }) max!: number;
    @Prop({ default: undefined }) step!: number;

    lastHandleInputTimeStamp = 0;
    timeOutLastHandleInput: any = null;

    // get placeHolderToUse(): string {
    //     if (this.placeHolder === "placeholder") {
    //         // No placeholder given. Use description.
    //         return this.description;
    //     }
    //     return this.placeHolder;
    // }

    /**
     * Runs when user presses a key.
     *
     * @param {KeyboardEvent} _e  The key event. Not used.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onKeyDown(_e: KeyboardEvent) {
        this.$emit("onKeyDown");
    }

    /**
     * The warning message.
     *
     * @returns {string} The warning message.
     */
    get warning(): string {
        if (this.warningFunc) {
            return this.warningFunc(this.modelValue);
        }
        return "";
    }

    /**
     * Get the description to use.
     *
     * @returns {string}  The description to use.
     */
    get descriptionToUse(): string {
        // return this.description;
        if (this.type !== "range") {
            return this.description;
        }

        // Range
        let descript = this.description === undefined ? "" : this.description;
        descript += " Current value: " + this.modelValue + ".";
        descript = descript.trim();
        return descript;
    }

    filterTimer: any = null;

    /**
     * Runs when the user clicks the action button.
     */
    onActionBtnClick() {
        this.$emit("onActionBtnClick");
    }

    /**
     * Let the parent component know of any changes, after user has not interacted
     * for a bit (to prevent rapid updates).
     *
     * @param {any} e  The value.
     */
    handleInput(e: any): void {
        if (this.filterFunc) {
            // If there's a filter funciton, update everything.
            clearTimeout(this.filterTimer);

            this.filterTimer = setTimeout(() => {
                // Get carot location
                let carot = e.target.selectionStart;

                // Apply filter
                let newVal = this.filterFunc(e.target.value);
                if (newVal === e.target.value) {
                    // If the value didn't change, don't update the input
                    return;
                }

                e.target.value = newVal;
                this.$emit("update:modelValue", newVal);
                this.$emit("onChange");

                // Set carot location after vue nexttick
                this.$nextTick(() => {
                    if (this.type !== "number") {
                        // Number doesn't support selection
                        e.target.setSelectionRange(carot, carot);
                    }
                });
            }, 1000);
        }

        // No filter function.

        // Note that it's delayed to prevent rapid reactivity. Good for color
        // selector.

        // If it was recently updated, don't try again. The setTimeout below
        // should be running and will update when ready.
        if (
            Date.now() - this.lastHandleInputTimeStamp <
            this.delayBetweenChangesDetected
        ) {
            return;
        }

        this.lastHandleInputTimeStamp = Date.now();
        this.timeOutLastHandleInput = setTimeout(() => {
            let val = e.target.value;
            if (this.type === "number") {
                val = parseFloat(val);

                // If val is NaN, abandon effort.
                if (isNaN(val)) {
                    return;
                }

                if (val === null) {
                    val = 0;
                }
            }

            this.$emit("update:modelValue", val);

            // In some circumstances (e.g., changing values in an object), not reactive.
            // Emit also "onChange" to signal the value has changed.
            this.$emit("onChange");
        }, this.delayBetweenChangesDetected);
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
// Input of type color
.form-control-color {
    width: 100%;
}
</style>
