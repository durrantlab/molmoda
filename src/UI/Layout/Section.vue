<template>
  <div :id="id" :class="cls">
    <div class="mb-0">
      <strong v-if="level === 1">{{title}}</strong>
      <em v-else-if="title !== ''">{{title}}</em>
      
      <div style="float:right;">
        <slot name="afterTitle"></slot>
      </div>
    </div>
    <slot></slot>
  </div>
</template>

<script lang="ts">

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

/**
 * Section component
 */
@Options({
  components: {},
})
export default class Section extends Vue {
  @Prop({ default: "" }) id!: string;
  @Prop({ default: "My Title" }) title!: string;
  @Prop({ default: 1 }) level!: number;
  @Prop({ default: "mb-2" }) cls!: string;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
