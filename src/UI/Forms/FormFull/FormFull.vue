<template>
  <span v-for="formElem of modelValue" v-bind:key="formElem.id">
    <FormWrapper
      v-if="formElem.type === FormElementType.Group"
      cls="border-0 mt-3"
    >
      <Accordian :id="formElem.id">
        <AccordianItem
          :id="formElem.id + '-item'"
          :title="formElem.label"
          :showInitially="asGroup(formElem).startOpened"
        >
          <FormFull v-model="asGroup(formElem).childElements"></FormFull>
        </AccordianItem>
      </Accordian>
    </FormWrapper>
    <FormWrapper v-else :label="formElem.label" cls="border-0">
      <FormInput
        v-if="formElem.type === FormElementType.Text"
        type="text"
        v-model="allowVal(formElem).val"
        @onChange="dataUpdated"
      />
      <FormInput
        v-else-if="formElem.type === FormElementType.Number"
        type="number"
        v-model.number="allowVal(formElem).val"
        @onChange="dataUpdated"
      />
      <FormInput
        v-else-if="formElem.type === FormElementType.Color"
        type="color"
        v-model.number="allowVal(formElem).val"
        @onChange="dataUpdated"
      />
      <FormSelect
        v-else-if="formElem.type === FormElementType.Select"
        v-model="allowVal(formElem).val"
        :options="getSelectOptions(formElem)"
        @onChange="dataUpdated"
      />
      <FormInput
        v-else-if="formElem.type === FormElementType.Range"
        v-model.number="allowVal(formElem).val"
        type="range"
        :min="getRangeMinMaxStep(formElem).min"
        :max="getRangeMinMaxStep(formElem).max"
        :step="getRangeMinMaxStep(formElem).step"
        @onChange="dataUpdated"
      />
    </FormWrapper>
  </span>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import FormInput from "../FormInput.vue";
import FormWrapper from "../FormWrapper.vue";
import FormSelect from "../FormSelect.vue";
import {
  FormElement,
  FormElemType,
  IFormGroup,
  IFormRange,
  IFormSelect,
  IFormTextOrColor,
} from "./FormFullInterfaces";
import Accordian from "@/UI/Layout/Accordian/Accordian.vue";
import AccordianItem from "@/UI/Layout/Accordian/AccordianItem.vue";

@Options({
  components: {
    FormWrapper,
    FormInput,
    FormSelect,
    Accordian,
    AccordianItem,
  },
})
export default class FormFull extends Vue {
  @Prop({ required: true }) modelValue!: FormElement[];

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

  allowVal(val: FormElement): IFormTextOrColor {
    // Just to make typing work in template...
    return val as IFormTextOrColor;
  }

  asGroup(val: FormElement): IFormGroup {
    return val as IFormGroup;
  }

  dataUpdated() {
    this.$emit("onChange", this.modelValue);
    this.$emit("update:modelValue", this.modelValue);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss"></style>
