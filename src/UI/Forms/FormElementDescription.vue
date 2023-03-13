<template>
  <Alert type="light" class="lh-2" style="padding: 0; margin: 0; line-height: 1.2em;">
    <small>
      <slot></slot>
      <span
        v-if="htmlDescription !== undefined"
        v-html="htmlDescription"
      ></span>
    </small>
  </Alert>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import Alert from "@/UI/Layout/Alert.vue";
import { Prop } from "vue-property-decorator";

/**
 * FormElementDescription component
 */
@Options({
  components: {
    Alert,
  },
})
export default class FormElementDescription extends Vue {
  @Prop({}) htmlDescription!: string;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->

<style lang="scss" scoped>
</style>
