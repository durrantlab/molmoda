<template>
  <span
    data-bs-toggle="tooltip"
    :data-bs-placement="placement"
    :title="title"
    ref="tooltip"
    style="margin:0;padding:0;"
  >
    <slot></slot>
  </span>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import BSToolTip from "bootstrap/js/dist/tooltip";

/**
 * Tooltip component
 */
@Options({
  components: {},
})
export default class Tooltip extends Vue {
  @Prop({ required: true }) title!: string;
  @Prop({ default: "top" }) placement!: string;

  /** mounted function */
  mounted() {
    new BSToolTip(this.$refs["tooltip"] as Element);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

