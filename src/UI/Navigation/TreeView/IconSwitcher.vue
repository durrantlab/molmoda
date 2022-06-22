<template>
  <div
    :style="flexFixedWidth"
    class="title-element"
  >
    <div v-if="useFirst"><font-awesome-icon :icon="iconID1" /></div>
    <div v-else><font-awesome-icon :icon="iconID2" :style="icon2Style" /></div>
  </div>
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

@Options({
  components: {},
})
export default class IconSwitcher extends Vue {
  @Prop({ required: true }) useFirst!: boolean;
  @Prop({ required: true }) iconID1!: Array<string>;
  @Prop({ required: true }) iconID2!: Array<string>;
  @Prop({ default: 15 }) width!: number;
  @Prop({ default: {} }) icon2Style!: any;

  get flexFixedWidth(): string {
    return `flex:0; max-width:${this.width}px; min-width:${this.width}px;`;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
</style>
