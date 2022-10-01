<template>
  <slot></slot>
</template>

<script lang="ts">
import { IContributorCredit, ISoftwareCredit } from "@/Plugins/PluginInterfaces";
import { Options } from "vue-class-component";
import { PluginParentRenderless, RunJobReturn } from "./PluginParentRenderless";

/**
 * SimpleMsgPlugin
 */
@Options({
  components: {},
})
export default class PluginParent extends PluginParentRenderless {
  // Per PluginParentRenderless, must define. Children should redefine.
  menuPath: string[] | string | null  = "";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [];
  pluginId = "";
  onPluginStart(payload: any) { return; }
  runJob(parameters: any): RunJobReturn { return undefined; }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

