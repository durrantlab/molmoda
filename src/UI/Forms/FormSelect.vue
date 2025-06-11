<template>
  <span>
    <div class="input-group">
      <select class="form-select form-select-sm" :id="id" :disabled="disabled" @input="handleInput" :value="modelValue">
        <!-- <option selected>Open this select menu</option> -->
        <option v-for="opt in optionsToUse" :value="opt.val" v-bind:key="opt.val" :disabled="opt.disabled === true">
          {{ opt.description }}
        </option>
      </select>
    </div>
    <FormElementDescription :description="description"></FormElementDescription>
  </span>
</template>

<script lang="ts">
import { randomID } from "@/Core/Utils/MiscUtils";
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import { IUserArgOption } from "./FormFull/FormFullInterfaces";
import FormElementDescription from "./FormElementDescription.vue";
import { slugify } from "@/Core/Utils/StringUtils";

/**
 * FormSelect component
 */
@Options({
  components: {
    FormElementDescription,
  },
})
export default class FormSelect extends Vue {
  @Prop({ required: true }) modelValue!: string;
  @Prop({ default: randomID() }) id!: string;
  @Prop({ default: false }) disabled!: boolean;
  @Prop({ required: true }) options!: (string | IUserArgOption)[];
  @Prop({}) description!: string;

  /**
   * Get the options to use in the select.
   *
   * @returns {IUserArgOption[]} The options to use.
   */
  get optionsToUse(): IUserArgOption[] {
    return this.options.map((o: string | IUserArgOption) => {
      if (typeof o === "string") {
        return {
          description: o,
          val: slugify(o),
        };
      } else {
        return o;
      }
    });
  }

  /**
   * Let the parent component know of any changes.
   *
   * @param {any} e  The value.
   */
  handleInput(e: any) {
    this.$emit("update:modelValue", e.target.value);

    // In some circumstances (e.g., changing values in an object), not reactive.
    // Emit also "onChange" to signal the value has changed.
    this.$emit("onChange", e.target.value);
  }

  /**
   * Validates that the current modelValue is present in the options. Logs a
   * console warning if it's not.
   */
  private validateModelValue() {
    // Note: The select element will render with nothing selected if modelValue
    // is not a valid option value. This check is for developer awareness.
    const validValues = this.optionsToUse.map((opt) => opt.val);
    if (this.modelValue && !validValues.includes(this.modelValue)) {
      console.warn(
        `FormSelect (id: ${this.id}): The provided modelValue "${this.modelValue}" is not a valid option. Available options are:`,
        validValues
      );
    }
  }

  /**
   * Watches for changes in modelValue to re-validate.
   */
  @Watch("modelValue")
  onModelValueChanged() {
    this.validateModelValue();
  }

  /**
   * Watches for changes in options to re-validate.
   */
  @Watch("options", { deep: true })
  onOptionsChanged() {
    this.validateModelValue();
  }

  /**
   * Runs when the component is mounted.
   */
  mounted() {
    this.validateModelValue();
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss"></style>
