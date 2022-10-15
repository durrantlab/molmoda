<template>
  <div v-if="testSpecified" style="height:0; opacity:0;">
    <span id="test-cmds">{{ $store.state.test.cmds }}</span>
    <span id="test-error">{{ $store.state.test.error }}</span>
  </div>
</template>
  
<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { pluginToTest } from "./PluginToTest";
//   import { Prop } from "vue-property-decorator";

/**
 * FormFull
 */
@Options({
  components: {},
})
export default class TestData extends Vue {
  // @Prop({ required: true }) cmds!: string;

  testSpecified = false;

  /**
   * Runs when the component is mounted.
   */
  mounted() {
    if (pluginToTest !== "") {
      this.testSpecified = true;
    }
  }
}
</script>
  
  <!-- Add "scoped" attribute to limit CSS to this component only -->
  <style lang="scss"></style>
  