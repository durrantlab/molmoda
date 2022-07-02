<template>
  <span v-for="formElem of modelValue" v-bind:key="formElem.varName">
    <FormWrapper :label="formElem.label" cls="ms-2 border-0">
      <FormInput
        v-if="formElem.type === FormElementType.Text"
        type="text"
        v-model="formElem.val"
        @changed="dataUpdated"
      />
      <FormInput
        v-else-if="formElem.type === FormElementType.Number"
        type="number"
        v-model.number="formElem.val"
        @changed="dataUpdated"
      />
      <FormInput
        v-else-if="formElem.type === FormElementType.Color"
        type="color"
        v-model.number="formElem.val"
        @changed="dataUpdated"
      />
      <FormSelect
        v-else-if="formElem.type === FormElementType.Select"
        v-model="formElem.val"
        :options="getSelectOptions(formElem)"
        @changed="dataUpdated"
      />
      <FormInput
        v-else-if="formElem.type === FormElementType.Range"
        v-model.number="formElem.val"
        type="range"
        :min="getRangeMinMaxStep(formElem).min"
        :max="getRangeMinMaxStep(formElem).max"
        :step="getRangeMinMaxStep(formElem).step"
        @changed="dataUpdated"
      />
    </FormWrapper>
  </span>
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import FormInput from "./FormInput.vue";
import FormWrapper from "./FormWrapper.vue";
import FormSelect from "./FormSelect.vue";

export enum FormElemType {
  Text,
  Number,
  Color,
  Select,
  Range,
}

interface IFormElement {
  type: FormElemType;
  varName: string;
  label?: string;
}

interface IFormTextOrColor extends IFormElement {
  val: string;
}

interface IFormNumber extends IFormElement {
  val: number;
}

interface IFormRange extends IFormNumber {
  min: number;
  max: number;
  step: number;
}

interface IFormSelect extends IFormElement {
  val: string;
  options: string[];
}

@Options({
  components: {
    FormWrapper,
    FormInput,
    FormSelect,
  },
})
export default class FormFull extends Vue {
  @Prop({ required: true }) modelValue!: (
    | IFormTextOrColor
    | IFormNumber
    | IFormSelect
    | IFormRange
  )[];

  FormElementType = FormElemType; // So accessible in template

  getSelectOptions(val: any) {
    return (val as IFormSelect).options;
  }

  getRangeMinMaxStep(val: any) {
    let val2 = val as IFormRange;
    return {
      min: val2.min,
      max: val2.max,
      step: val2.step,
    };
  }

  dataUpdated() {
    this.$emit("update:modelValue", this.modelValue);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss"></style>
