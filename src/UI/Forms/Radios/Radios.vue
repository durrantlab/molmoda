<template>
  <FormWrapper :label="description" :smallLabel="true">
    <div class="btn-group" role="group" :aria-label="'Radio toggle button group for ' + description">
      <!-- <div v-for="option of options" :key="option" @click="handleInput(option)"> -->
      <Radio
        v-for="option of options"
        :key="option"
        :option="option"
        :name="id"
        :id="idToUse(option)"
        :checked="option === modelValue"
        @onclick="handleInput(option)"
      >
      </Radio>
    </div>
  </FormWrapper>
</template>

<script lang="ts">

import { randomID } from "@/Core/Utils/MiscUtils";
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import Radio from "./Radio.vue";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";

/**
 * Radios component
 */
@Options({
  components: {
    Radio,
    FormWrapper
  },
})
export default class Radios extends Vue {
  @Prop() modelValue!: any;
  @Prop({ required: true }) options!: Array<string>;
  @Prop() description!: string;

  id = "";

  /**
   * Let the parent component know of any changes.
   *
   * @param {any} e  The value.
   */
  handleInput(e: string) {
    this.$emit("update:modelValue", e);

    // In some circumstances (e.g., changing values in an object), not reactive.
    // Emit also "onChange" to signal the value has changed.
    this.$emit("onChange");
  }

  /**
   * Get the id to use on the Radio component
   *
   * @param {string} option  The option name to use.
   * @returns {string} The id to use.
   */
  idToUse(option: string): string {
    return this.id + "-" + option;
  }

  /** mounted function */
  mounted() {
    this.id = randomID();
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss"></style>
