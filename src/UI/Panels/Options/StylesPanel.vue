<template>
  <Styles />
</template>

<script lang="ts">

import { Options, Vue } from "vue-class-component";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import FormInput from "@/UI/Forms/FormInput.vue";
import FormSelect from "@/UI/Forms/FormSelect.vue";
import FormCheckBox from "@/UI/Forms/FormCheckBox.vue";
import Section from "@/UI/Layout/Section.vue";
import Styles from "./Styles/Styles.vue";

/**
 * StylesPanel component
 */
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
export default class StylesPanel extends Vue {}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
