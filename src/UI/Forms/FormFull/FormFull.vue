<template>
    <span>
        <span v-for="formElem of modelValue" v-bind:key="formElem.id">
            <!-- a form group (accordion) -->
            <FormWrapper
                v-if="
                    formElem.type === FormElementType.Group &&
                    !disabled(formElem)
                "
                :cls="'border-0 mt-' + spacing"
            >
                <Accordian :id="formElem.id">
                    <AccordianItem
                        :id="itemId(formElem)"
                        :title="formElem.label"
                        :showInitially="asGroup(formElem).startOpened"
                    >
                        <!-- :hideIfDisabled="hideIfDisabled" -->
                        <FormFull
                            v-model="asGroup(formElem).childElements"
                            :id="id"
                            @onChange="onDataUpdated"
                        ></FormFull>
                    </AccordianItem>
                </Accordian>
            </FormWrapper>
            <FormWrapper
                v-else-if="!hideIfDisabled || makeGeneric(formElem).enabled"
                :label="labelToUse(formElem)"
                :cls="'border-0 mt-' + spacing"
                :disabled="disabled(formElem)"
            >
                <!-- any of the other form elements (not group) -->
                <FormInput
                    v-if="formElem.type === FormElementType.Text"
                    type="text"
                    v-model="makeGeneric(formElem).val"
                    :placeHolder="makeGeneric(formElem).placeHolder"
                    :filterFunc="makeGeneric(formElem).filterFunc"
                    @onChange="onDataUpdated"
                    :id="itemId(formElem)"
                    :disabled="disabled(formElem)"
                    :description="makeGeneric(formElem).description"
                />
                <FormInput
                    v-else-if="formElem.type === FormElementType.Number"
                    type="number"
                    v-model.number="makeGeneric(formElem).val"
                    :placeHolder="makeGeneric(formElem).placeHolder"
                    :filterFunc="makeGeneric(formElem).filterFunc"
                    @onChange="onDataUpdated"
                    :id="itemId(formElem)"
                    :disabled="disabled(formElem)"
                    :description="makeGeneric(formElem).description"
                />
                <FormInput
                    v-else-if="formElem.type === FormElementType.Color"
                    type="color"
                    v-model.number="makeGeneric(formElem).val"
                    @onChange="onDataUpdated"
                    :id="itemId(formElem)"
                    :disabled="disabled(formElem)"
                    :description="makeGeneric(formElem).description"
                />
                <FormInput
                    v-else-if="formElem.type === FormElementType.Range"
                    v-model.number="makeGeneric(formElem).val"
                    type="range"
                    :min="getRangeMinMaxStep(formElem).min"
                    :max="getRangeMinMaxStep(formElem).max"
                    :step="getRangeMinMaxStep(formElem).step"
                    @onChange="onDataUpdated"
                    :id="itemId(formElem)"
                    :disabled="disabled(formElem)"
                    :description="makeGeneric(formElem).description"
                    :delayBetweenChangesDetected="0"
                />
                <FormTextArea
                    v-else-if="formElem.type === FormElementType.TextArea"
                    v-model.number="makeGeneric(formElem).val"
                    @onChange="onDataUpdated"
                    :id="itemId(formElem)"
                    :disabled="disabled(formElem)"
                    :description="makeGeneric(formElem).description"
                    :delayBetweenChangesDetected="0"
                ></FormTextArea>
                <FormSelect
                    v-else-if="formElem.type === FormElementType.Select"
                    v-model="makeGeneric(formElem).val"
                    :options="getSelectOptions(formElem)"
                    @onChange="onDataUpdated"
                    :id="itemId(formElem)"
                    :disabled="disabled(formElem)"
                />
                <FormCheckBox
                    v-else-if="formElem.type === FormElementType.Checkbox"
                    v-model="makeGeneric(formElem).val"
                    :text="validateLabel(makeGeneric(formElem).label)"
                    @onChange="onDataUpdated"
                    :id="itemId(formElem)"
                    :disabled="disabled(formElem)"
                    :description="makeGeneric(formElem).description"
                />
                <!-- :placeHolder="makeGeneric(formElem).placeHolder" -->
                <!-- :filterFunc="makeGeneric(formElem).filterFunc" -->
                <MoleculeInputParams
                    v-else-if="
                        formElem.type === FormElementType.MoleculeInputParams &&
                        makeGeneric(formElem).val.molsToConsider !== undefined
                    "
                    v-model="makeGeneric(formElem).val"
                    @onChange="onDataUpdated"
                    :id="itemId(formElem)"
                    :disabled="disabled(formElem)"
                >
                </MoleculeInputParams>

                <FormVector3D
                    v-else-if="formElem.type === FormElementType.Vector3D"
                    v-model="makeGeneric(formElem).val"
                    :placeHolder="makeGeneric(formElem).placeHolder"
                    @onChange="onDataUpdated"
                    :id="itemId(formElem)"
                    :filterFunc="makeGeneric(formElem).filterFunc"
                    :disabled="disabled(formElem)"
                    :description="makeGeneric(formElem).description"
                />

                <Alert
                    v-else-if="formElem.type === FormElementType.Alert"
                    :id="itemId(formElem)"
                    :type="makeGeneric(formElem).alertType"
                    extraClasses="mt-2 mb-0"
                >
                    <span v-if="formElem.val">
                        {{ formElem.val }}
                    </span>
                </Alert>

                <!-- extraClasses="mt-2 mb-0" -->
                <!-- :placeHolder="makeGeneric(formElem).placeHolder" -->
                <!-- @onChange="onDataUpdated" -->
                <!-- :filterFunc="makeGeneric(formElem).filterFunc" -->
                <FormSelectRegion
                    v-else-if="formElem.type === FormElementType.SelectRegion"
                    v-model="makeGeneric(formElem).val"
                    :id="itemId(formElem)"
                    :disabled="disabled(formElem)"
                    :description="makeGeneric(formElem).description"
                    :regionName="makeGeneric(formElem).regionName"
                ></FormSelectRegion>
            </FormWrapper>
        </span>
    </span>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import FormInput from "../FormInput.vue";
import FormWrapper from "../FormWrapper.vue";
import FormSelect from "../FormSelect.vue";
import {
    UserArg,
    UserArgType,
    IUserArgGroup,
    IUserArgMoleculeInputParams,
    IUserArgOption,
    IUserArgRange,
    IUserArgSelect,
} from "./FormFullInterfaces";
import Accordian from "@/UI/Layout/Accordian/Accordian.vue";
import AccordianItem from "@/UI/Layout/Accordian/AccordianItem.vue";
import MoleculeInputParams from "../MoleculeInputParams/MoleculeInputParams.vue";
import FormCheckBox from "../FormCheckBox.vue";
import FormVector3D from "../FormVector3D.vue";
import Alert from "@/UI/Layout/Alert.vue";
import FormSelectRegion from "../FormSelectRegion/FormSelectRegion.vue";
import FormTextArea from "../FormTextArea.vue";

/**
 * FormFull
 */
@Options({
    components: {
        FormWrapper,
        FormInput,
        FormSelect,
        FormTextArea,
        Accordian,
        AccordianItem,
        MoleculeInputParams,
        FormCheckBox,
        FormVector3D,
        Alert,
        FormSelectRegion,
    },
})
export default class FormFull extends Vue {
    @Prop({ required: true }) modelValue!: UserArg[];
    @Prop({ required: true }) id!: string;
    @Prop({ default: false }) hideIfDisabled!: boolean;
    @Prop({ default: "3" }) spacing!: string;

    FormElementType = UserArgType; // So accessible in template

    /**
     * Get the options for a select element.
     *
     * @param {any} val  The form element.
     * @returns {(string | IUserArgOption)[]}  The options.
     */
    getSelectOptions(val: any): (string | IUserArgOption)[] {
        return (val as IUserArgSelect).options;
    }

    /**
     * Get the min, max, and step for a range element.
     *
     * @param {any} val  Contains information about the range (like IUserArgRange).
     * @returns {any}    The min, max, and step.
     */
    getRangeMinMaxStep(val: any): any {
        let val2 = val as IUserArgRange;
        return {
            min: val2.min,
            max: val2.max,
            step: val2.step,
        };
    }

    /**
     * Get the DOM id for a form element.
     *
     * @param {UserArg} formElem  The form element.
     * @returns {string}              The DOM id.
     */
    itemId(formElem: UserArg): string {
        return `${formElem.id}-${this.id}-item`;
    }

    /**
     * Determine if a given form element is currently disabled.
     *
     * @param {UserArg} formElem  The form element.
     * @returns {boolean}  True if disabled, false otherwise.
     */
    disabled(formElem: UserArg): boolean {
        return this.makeGeneric(formElem).enabled === false;
    }

    /**
     * Cast the form element to an IFormTextOrColor. Just to make typing work in
     * template...
     *
     * @param {any} frmElem  The form element.
     * @returns {IUserArgGroup}  The IFormTextOrColor.
     */
    makeGeneric(frmElem: UserArg): any {
        return frmElem as any;
    }

    /**
     * Cast the form element to an IUserArgMoleculeInputParams. Just to make typing work
     * in template...
     *
     * @param {any} val  The form element.
     * @returns {IUserArgGroup}  The IUserArgMoleculeInputParams.
     */
    allowConsiderCompounds(val: UserArg): IUserArgMoleculeInputParams {
        return val as IUserArgMoleculeInputParams;
    }

    /**
     * Cast the form element to an IUserArgGroup. Just to make typing work in
     * template...
     *
     * @param {UserArg} val  The form element.
     * @returns {IUserArgGroup}  The IUserArgGroup.
     */
    asGroup(val: UserArg): IUserArgGroup {
        return val as IUserArgGroup;
    }

    /**
     * Validate a label.
     *
     * @param {string | undefined} label  The label to validate.
     * @returns {string | undefined}  The label to use.
     */
    validateLabel(label: string | undefined): string | undefined {
        if (label === undefined) {
            return label;
        }

        // Do some validation on the label. Label should not end in
        // punctuation
        if (
            (label.endsWith(".") ||
                label.endsWith("!") ||
                label.endsWith("?")) &&
            !label.endsWith("etc.")
        ) {
            throw new Error(
                `FormFull: Label should not end in punctuation: ${label} Use description for extended explanations.`
            );
        }

        // Must start with capital letter
        if (label[0] !== label[0].toUpperCase()) {
            throw new Error(
                `FormFull: Label must start with capital letter: ${label}`
            );
        }

        // Words with more than three letters
        let words = label.split(" ").filter((x) => x.length > 3);
        if (words.length > 1) {
            // Percentage of words that are capitalized
            let pct =
                words.filter((x) => x[0] === x[0].toUpperCase()).length /
                words.length;
            if (pct > 0.6) {
                throw new Error(
                    `FormFull: At least 60% of big words in label must be lower case: ${label}. Current percent: ${
                        100 * pct
                    }%.`
                );
            }
        }

        return label;
    }

    /**
     * Get the label to use for a form element.
     *
     * @param {UserArg} formElem  The form element.
     * @returns {string | undefined}  The label to use.
     */
    labelToUse(formElem: UserArg): string | undefined {
        if (formElem.type === UserArgType.Checkbox) {
            // For checkbox, label is the text
            return "";
        }
        if (formElem.label) {
            // if (formElem.type === UserArgType.Range) {
            //     return `${formElem.label} (${this.makeGeneric(formElem).val})`;
            // }

            return this.validateLabel(formElem.label);
        }

        return "";
    }

    /**
     * When data is updated, emit the new data.
     */
    onDataUpdated() {
        this.$emit("onChange", this.modelValue);
        this.$emit("update:modelValue", this.modelValue);
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss"></style>
