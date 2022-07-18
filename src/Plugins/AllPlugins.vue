<template>
  <div>
    <AboutPlugin @onPluginSetup="onPluginSetup" :creditsToShow="credits" />
    <LoadFilePlugin @onPluginSetup="onPluginSetup"></LoadFilePlugin>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import AboutPlugin from "@/Plugins/Core/AboutPlugin.vue";
import LoadFilePlugin from "@/Plugins/Core/Loaders/LoadFilePlugin.vue";
import { Prop } from "vue-property-decorator";
import { ICredit } from "./PluginInterfaces";
import { IMenuItem } from "@/UI/Navigation/Menu/Menu";
import { IPluginSetupInfo } from "./PluginParent";

@Options({
  components: {
    AboutPlugin,
    LoadFilePlugin,
  },
})
export default class AllPlugins extends Vue {
  @Prop({ required: true }) credits!: ICredit[];

  onPluginSetup(pluginSetupInfo: IPluginSetupInfo) {
    // Relay up the chain (from individual plugins to app).
    this.$emit("onPluginSetup", pluginSetupInfo);
  }
}
</script>

<style scoped lang="scss">
</style>
