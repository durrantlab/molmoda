<template>
  <div :id="id" class="mb-2">
    <div class="mb-0">
      <strong v-if="level === 1">{{title}}</strong>
      <i v-else>{{title}}</i>
      
      <div style="float:right;">
        <slot name="afterTitle"></slot>
      </div>
    </div>
    <slot></slot>
  </div>
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

@Options({
  components: {},
})
export default class Section extends Vue {
  @Prop({ default: "" }) id!: string;
  @Prop({ default: "My Title" }) title!: string;
  @Prop({ default: 1 }) level!: number;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
