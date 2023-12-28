<template>
    <span>
        <div :class="'container-fluid ' + cls" :style="styl">
            <div class="row">
                <div
                    :class="'col px-0' + (axisIdx === 1 ? ' px-1' : '')"
                    v-for="axisIdx in axesIdxs"
                    :key="axisIdx"
                >
                    <input
                        :ref="`inputElem${axes[axisIdx]}`"
                        :data-idx="axisIdx"
                        type="number"
                        class="form-control form-control-sm"
                        :readonly="readonly"
                        :id="`${axes[axisIdx]}-${id}`"
                        :placeholder="axes[axisIdx].toUpperCase() + ' value...'"
                        :disabled="disabled"
                        @input="handleInput"
                        @keydown="onKeyDown"
                        :value="modelValue[axisIdx]"
                    />
                </div>
            </div>
        </div>
        <FormElementDescription
            v-if="description !== undefined"
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
 * FormVector3D component
 */
@Options({
    components: {
        FormElementDescription,
    },
})
export default class FormVector3D extends Vue {
    @Prop({ required: true }) modelValue!: [number, number, number];
    @Prop({ default: randomID() }) id!: string;
    @Prop({ default: "placeholder" }) placeHolder!: string;
    @Prop({ default: false }) disabled!: boolean;
    @Prop({}) description!: string;
    @Prop({ default: false }) readonly!: boolean;
    @Prop({ required: false }) filterFunc!: Function;
    @Prop({ default: "" }) cls!: string;
    @Prop({ default: "" }) styl!: string;
    @Prop({ default: formInputDelayUpdate })
    delayBetweenChangesDetected!: number;

    axesIdxs = [0, 1, 2];
    axes = ["x", "y", "z"];

    /**
     * Runs when user presses a key.
     *
     * @param {KeyboardEvent} _e  The key event. Not used.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onKeyDown(_e: KeyboardEvent) {
        this.$emit("onKeyDown");
    }

    lastHandleInputTimeStamp = 0;
    handleInputTimeout: any = null;

    /**
     * Let the parent component know of any changes, after user has not interacted
     * for a bit (to prevent rapid updates).
     *
     * @param {any} e  The value.
     */
    handleInput(e: any): void {
        // It's important not to handle the input too rapidly. Good to give the
        // user time to fix any temporarily wrong values.

        const now = Date.now();

        if (
            now - this.lastHandleInputTimeStamp <
            this.delayBetweenChangesDetected
        ) {
            // Too soon. Timeout below will handle.
            return;
        }

        // Clear previous timeout
        clearTimeout(this.handleInputTimeout);

        this.lastHandleInputTimeStamp = now;
        this.handleInputTimeout = setTimeout(() => {
            // Get "idx" data from target
            const idx = parseInt(e.target.dataset.idx);
            const newVals = JSON.parse(JSON.stringify(this.modelValue));

            let newVal = parseFloat(e.target.value);

            if (isNaN(newVal)) {
                // If not a number, set to 0.
                newVal = 0;
            }

            if (this.filterFunc) {
                // If there's a filter funciton, update everything.
                newVal = this.filterFunc(newVal);
            }

            newVals[idx] = newVal;
            this.$emit("update:modelValue", newVals);

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
// .form-control-color {
//     width: 100%;
// }
</style>
