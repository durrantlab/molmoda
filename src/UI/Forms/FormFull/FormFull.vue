<template>
    <span>
        <span v-for="formElem of modelValue" v-bind:key="formElem.id">
            <FormWrapper
                v-if="
                    formElem.type === FormElementType.Group &&
                    !disabled(formElem)
                "
                cls="border-0 mt-2"
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
                :label="
                    formElem.type === FormElementType.Checkbox
                        ? ''
                        : formElem.label
                "
                cls="border-0 mt-2"
                :disabled="disabled(formElem)"
            >
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
                />
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
                    v-model.boolean="makeGeneric(formElem).val"
                    :text="makeGeneric(formElem).label"
                    @onChange="onDataUpdated"
                    :id="itemId(formElem)"
                    :disabled="disabled(formElem)"
                    :description="makeGeneric(formElem).description"
                />
                <!-- :placeHolder="makeGeneric(formElem).placeHolder" -->
                <!-- :filterFunc="makeGeneric(formElem).filterFunc" -->
                <MoleculeInputParams
                    v-else-if="
                        formElem.type === FormElementType.MoleculeInputParams
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
                    <span v-if="formElem.description">
                        {{ formElem.description }}
                    </span>
                </Alert>

                <!-- extraClasses="mt-2 mb-0" -->
                <!-- :placeHolder="makeGeneric(formElem).placeHolder" -->
                <!-- @onChange="onDataUpdated" -->
                <!-- :filterFunc="makeGeneric(formElem).filterFunc" -->
                <FormSelectShape
                    v-else-if="formElem.type === FormElementType.SelectShape"
                    v-model="makeGeneric(formElem).val"
                    :id="itemId(formElem)"
                    :disabled="disabled(formElem)"
                    :description="makeGeneric(formElem).description"
                ></FormSelectShape>
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
    FormElement,
    FormElemType,
    IFormGroup,
    IFormMoleculeInputParams,
    IFormOption,
    IFormRange,
    IFormSelect,
    IGenericFormElement,
} from "./FormFullInterfaces";
import Accordian from "@/UI/Layout/Accordian/Accordian.vue";
import AccordianItem from "@/UI/Layout/Accordian/AccordianItem.vue";
import MoleculeInputParams from "../MoleculeInputParams/MoleculeInputParams.vue";
import FormCheckBox from "../FormCheckBox.vue";
import FormVector3D from "../FormVector3D.vue";
import Alert from "@/UI/Layout/Alert.vue";
import FormSelectShape from "../FormSelectShape/FormSelectShape.vue";

/**
 * FormFull
 */
@Options({
    components: {
        FormWrapper,
        FormInput,
        FormSelect,
        Accordian,
        AccordianItem,
        MoleculeInputParams,
        FormCheckBox,
        FormVector3D,
        Alert,
        FormSelectShape
    },
})
export default class FormFull extends Vue {
    @Prop({ required: true }) modelValue!: FormElement[];
    @Prop({ required: true }) id!: FormElement[];
    @Prop({ default: false }) hideIfDisabled!: boolean;

    FormElementType = FormElemType; // So accessible in template

    /**
     * Get the options for a select element.
     *
     * @param {any} val  The form element.
     * @returns {(string | IFormOption)[]}  The options.
     */
    getSelectOptions(val: any): (string | IFormOption)[] {
        return (val as IFormSelect).options;
    }

    /**
     * Get the min, max, and step for a range element.
     *
     * @param {any} val  Contains information about the range (like IFormRange).
     * @returns {any}    The min, max, and step.
     */
    getRangeMinMaxStep(val: any): any {
        let val2 = val as IFormRange;
        return {
            min: val2.min,
            max: val2.max,
            step: val2.step,
        };
    }

    /**
     * Get the DOM id for a form element.
     *
     * @param {FormElement} formElem  The form element.
     * @returns {string}              The DOM id.
     */
    itemId(formElem: FormElement): string {
        return `${formElem.id}-${this.id}-item`;
    }

    /**
     * Determine if a given form element is currently disabled.
     *
     * @param {FormElement} formElem  The form element.
     * @returns {boolean}  True if disabled, false otherwise.
     */
    disabled(formElem: FormElement): boolean {
        return this.makeGeneric(formElem).enabled === false;
    }

    /**
     * Cast the form element to an IFormTextOrColor. Just to make typing work in
     * template...
     *
     * @param {any} frmElem  The form element.
     * @returns {IFormGroup}  The IFormTextOrColor.
     */
    makeGeneric(frmElem: FormElement): IGenericFormElement {
        return frmElem as IGenericFormElement;
    }

    /**
     * Cast the form element to an IFormMoleculeInputParams. Just to make typing work
     * in template...
     *
     * @param {any} val  The form element.
     * @returns {IFormGroup}  The IFormMoleculeInputParams.
     */
    allowConsiderCompounds(val: FormElement): IFormMoleculeInputParams {
        return val as IFormMoleculeInputParams;
    }

    /**
     * Cast the form element to an IFormGroup. Just to make typing work in
     * template...
     *
     * @param {FormElement} val  The form element.
     * @returns {IFormGroup}  The IFormGroup.
     */
    asGroup(val: FormElement): IFormGroup {
        return val as IFormGroup;
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
