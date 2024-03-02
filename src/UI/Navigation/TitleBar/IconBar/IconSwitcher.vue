<template>
  <Tooltip :tip="title" :placement="tipPlacement">
    <div
      :style="flexFixedWidth + (clickable ? 'cursor: pointer;' : '')"
      class="title-element"
    >
      <div v-if="useFirst"><Icon :icon="iconID1" /></div>
      <div v-else>
        <Icon :icon="iconID2" :style="icon2Style" />
      </div>
    </div>
  </Tooltip>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import Tooltip from "@/UI/MessageAlerts/Tooltip.vue";
import Icon from "@/UI/Components/Icon.vue";

/**
 * IconSwitcher component
 */
@Options({
  components: {
    Tooltip,
    Icon
  },
})
export default class IconSwitcher extends Vue {
  @Prop({ required: true }) useFirst!: boolean;
  @Prop({ required: true }) iconID1!: string[] | string;
  @Prop({ required: true }) iconID2!: string[] | string;
  @Prop({ default: 15 }) width!: number;
  @Prop({ default: {} }) icon2Style!: any;
  @Prop({ default: false }) clickable!: any;
  @Prop({ default: "" }) title!: string;
  @Prop({ default: "top" }) tipPlacement!: string;

  /**
   * Get the style for a fixed-width element.
   * 
   * @returns {string}  The style for the element.
   */
  get flexFixedWidth(): string {
    return `flex:0; max-width:${this.width}px; min-width:${this.width}px;`;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
</style>
