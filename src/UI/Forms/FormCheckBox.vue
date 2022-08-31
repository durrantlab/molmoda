<template>
  <div :class="'form-check' + (toggle ? ' form-switch' : '')">
    <input
      class="form-check-input"
      type="checkbox"
      :title="text"
      :disabled="disabled"
      @input="handleInput"
      :checked="modelValue"
      :id="id"
      :role="toggle ? 'switch' : ''"
    />
    <label v-if="text !== ''" :for="id" class="form-check-label">
      {{ text }}
    </label>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

@Options({
  components: {},
})
export default class FormCheckBox extends Vue {
  @Prop({ required: true }) modelValue!: boolean;

  @Prop({ required: true }) id!: string;
  @Prop({ default: "" }) text!: string;
  @Prop({ default: false }) disabled!: boolean;
  @Prop({ default: false }) toggle!: boolean;

  handleInput(e: any) {
    this.$emit("update:modelValue", e.target.checked);

    // In some circumstances (e.g., changing values in an object), not reactive.
    // Emit also "onChange" to signal the value has changed.
    this.$emit("onChange");
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss"></style>
