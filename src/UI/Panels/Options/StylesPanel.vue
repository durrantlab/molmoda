<template>
  <Styles />
  <!-- <br />
  <hr />
  <div :style="'background-color:' + test2">{{ test }}; {{ sel }}</div>
  <FormWrapper label="My Label">
    <FormInput
      v-model="test"
      placeHolder="place"
      id="test"
      type="number"
    ></FormInput>
  </FormWrapper>
  <FormWrapper label="My color">
    <FormInput
      v-model="test2"
      placeHolder="#ffffff"
      id="clr"
      type="color"
    ></FormInput>
  </FormWrapper>
  <FormWrapper label="my label">
    <FormSelect
      id="sel"
      v-model="sel"
      :options="['i am nice', 'we', 'dog face', 'cat(face )']"
    ></FormSelect>
  </FormWrapper>
  <FormWrapper label="my check lbl">
    <FormCheckBox
      id="chk"
      text="my check"
      v-model="chk"
      :disabled="true"
    ></FormCheckBox>
    <FormCheckBox
      id="chk"
      text="my check"
      v-model="chk"
      :toggle="true"
    ></FormCheckBox>
  </FormWrapper> -->
</template>

<script lang="ts">

import { Options, Vue } from "vue-class-component";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import FormInput from "@/UI/Forms/FormInput.vue";
import FormSelect from "@/UI/Forms/FormSelect.vue";
import FormCheckBox from "@/UI/Forms/FormCheckBox.vue";
import Section from "@/UI/Layout/Section.vue";
import Styles from "./Styles/Styles.vue";

@Options({
  components: {
    FormWrapper,
    FormInput,
    FormSelect,
    FormCheckBox,
    Section,
    Styles
  },
})
export default class StylesPanel extends Vue {
  // test = 3;
  // test2 = "#ff0000";
  // sel = "we";
  // chk = true;

}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
