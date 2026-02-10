<template>
  <div class="accordion mb-2" :id="id">
    <slot></slot>
  </div>
</template>

<script lang="ts">

import { Component, Vue, Prop } from "vue-facing-decorator";

/**
 * Accordian component
 */
@Component({
  components: {},
})
export default class Accordian extends Vue {
  @Prop({ default: "" }) id!: string;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
