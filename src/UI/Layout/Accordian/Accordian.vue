<template>
  <div class="accordion mb-2" :id="id">
    <slot></slot>
  </div>
</template>

<script lang="ts">

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

/**
 * Accordian component
 */
@Options({
  components: {},
})
export default class Accordian extends Vue {
  @Prop({ default: "" }) id!: string;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
