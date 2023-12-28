<template>
    <span>
        <textarea
            class="form-control"
            rows="3"
            ref="inputElem"
            :readonly="readonly"
            :id="id"
            :placeholder="placeHolder"
            :disabled="disabled"
            @input="handleInput"
            @keydown="onKeyDown"
            :value="modelValue"
        />
        <FormElementDescription
            v-if="description !== '' && description !== undefined"
            :description="description"
        ></FormElementDescription>
    </span>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { randomID } from "@/Core/Utils";
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import FormElementDescription from "@/UI/Forms/FormElementDescription.vue";
import { formInputDelayUpdate } from "@/Core/GlobalVars";

/**
 * FormTextArea component
 */
@Options({
    components: {
        FormElementDescription,
    },
})
export default class FormTextArea extends Vue {
    @Prop({ required: true }) modelValue!: any;
    @Prop({ default: randomID() }) id!: string;
    @Prop({ default: "placeholder" }) placeHolder!: string;
    @Prop({ default: false }) disabled!: boolean;
    @Prop({ required: false }) filterFunc!: Function;
    @Prop({}) description!: string;
    @Prop({ default: formInputDelayUpdate })
    delayBetweenChangesDetected!: number;
    @Prop({ default: false }) readonly!: boolean;

    lastHandleInputTimeStamp = 0;
    timeOutLastHandleInput: any = null;

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
     * Let the parent component know of any changes, after user has not interacted
     * for a bit (to prevent rapid updates).
     *
     * @param {any} e  The value.
     */
    handleInput(e: any): void {
        if (this.filterFunc) {
            // If there's a filter funciton, update everything.

            // Get carot location
            let carot = e.target.selectionStart;

            // Apply filter
            e.target.value = this.filterFunc(e.target.value);

            // Set carot location after vue nexttick
            this.$nextTick(() => {
              e.target.setSelectionRange(carot, carot);
            });
        }

        // No filter function. Note that it's delayed to prevent rapid reactivity.
        // Good for color selector.

        // If less 0.5 seconds haven't passed yet, don't try again.
        if (
            Date.now() - this.lastHandleInputTimeStamp <
            this.delayBetweenChangesDetected
        ) {
            return;
        }

        this.lastHandleInputTimeStamp = Date.now();
        this.timeOutLastHandleInput = setTimeout(() => {
            let val = e.target.value;
            this.$emit("update:modelValue", val);

            // In some circumstances (e.g., changing values in an object), not reactive.
            // Emit also "onChange" to signal the value has changed.
            this.$emit("onChange");
        }, this.delayBetweenChangesDetected);
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped></style>
