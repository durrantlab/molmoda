<template>
  <div style="overflow-y: scroll; height: 100%;">
    <table class="table table-striped table-sm">
      <!-- <thead>
    <tr>
      <td scope="col">Time</td>
      <td scope="col">Message</td>
    </tr>
  </thead> -->
      <tbody>
        <tr v-for="log in $store.state.log" :key="log.timestamp">
          <td style="width: 160px">
            <small>{{ log.timestamp }}</small>
          </td>
          <td>
            <small>{{ log.message }}</small>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
// import FormWrapper from "@/UI/Forms/FormWrapper.vue";
// import FormInput from "@/UI/Forms/FormInput.vue";
// import FormSelect from "@/UI/Forms/FormSelect.vue";
// import FormCheckBox from "@/UI/Forms/FormCheckBox.vue";
// import Section from "@/UI/Layout/Section.vue";
// import Styles from "./Styles/Styles.vue";

/**
 * StylesPanel component
 */
@Options({
  components: {
    // FormWrapper,
    // FormInput,
    // FormSelect,
    // FormCheckBox,
    // Section,
    // Styles
  },
})
export default class LogPanel extends Vue {}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
