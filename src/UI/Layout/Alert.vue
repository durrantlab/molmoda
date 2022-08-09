<template>
  <div :class="'alert alert-' + type" style="width: 100%;" role="alert">
    <slot></slot>
  </div>
</template>

<script lang="ts">

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

@Options({
  components: {},
})
export default class Alert extends Vue {
  @Prop({ default: "primary" }) type!: string;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
