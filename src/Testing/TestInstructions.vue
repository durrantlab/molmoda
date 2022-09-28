<template>
  <span v-if="testSpecified" style="display: block">
    <span id="test-instructions">{{ $store.state.test.instructions }}</span>
    <span id="test-error">{{ $store.state.test.error }}</span>
  </span>
</template>
  
<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { pluginToTest } from "./SetupTests";
//   import { Prop } from "vue-property-decorator";

/**
 * FormFull
 */
@Options({
  components: {},
})
export default class TestInstructions extends Vue {
  // @Prop({ required: true }) instructions!: string;

  testSpecified = false;

  mounted() {
    if (pluginToTest !== "") {
      this.testSpecified = true;
    }
  }
}
</script>
  
  <!-- Add "scoped" attribute to limit CSS to this component only -->
  <style lang="scss"></style>
  