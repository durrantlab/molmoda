<template>
  <div>
    <AboutPlugin @onError="onError" @onPluginSetup="onPluginSetup" :softwareCreditsToShow="softwareCredits" :contributorCreditsToShow="contributorCredits"/>
    <LoadFilePlugin @onError="onError" @onPluginSetup="onPluginSetup"></LoadFilePlugin>
    <LoadPDBPlugin @onError="onError" @onPluginSetup="onPluginSetup"></LoadPDBPlugin>
    <LoadAlphaFoldPlugin @onError="onError" @onPluginSetup="onPluginSetup"></LoadAlphaFoldPlugin>
    <LoadPubChemPlugin @onError="onError" @onPluginSetup="onPluginSetup"></LoadPubChemPlugin>
    <SaveSessionPlugin @onError="onError" @onPluginSetup="onPluginSetup"></SaveSessionPlugin>
    <OpenSessionPlugin @onError="onError" @onPluginSetup="onPluginSetup"></OpenSessionPlugin>
    <SavePNGPlugin @onError="onError" @onPluginSetup="onPluginSetup"></SavePNGPlugin>
    <SaveVRMLPlugin @onError="onError" @onPluginSetup="onPluginSetup"></SaveVRMLPlugin>
    <SavePDBMol2Plugin @onError="onError" @onPluginSetup="onPluginSetup"></SavePDBMol2Plugin>
    <TestPlugin @onError="onError" @onPluginSetup="onPluginSetup"></TestPlugin>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import AboutPlugin from "@/Plugins/Core/AboutPlugin.vue";
import { Prop } from "vue-property-decorator";
import { IContributorCredit, ISoftwareCredit } from "./PluginInterfaces";
import { IPluginSetupInfo } from "./PluginParent";
import SavePNGPlugin from "./Core/MolLoaderSaver/MolSaver/SavePNGPlugin.vue";
import SaveVRMLPlugin from "./Core/MolLoaderSaver/MolSaver/SaveVRMLPlugin.vue";
import OpenSessionPlugin from "./Core/SessionLoaderSaver/OpenSessionPlugin.vue";
import SaveSessionPlugin from "./Core/SessionLoaderSaver/SaveSessionPlugin.vue";
import LoadPubChemPlugin from "./Core/MolLoaderSaver/MolLoaders/LoadPubChemPlugin.vue";
import LoadAlphaFoldPlugin from "./Core/MolLoaderSaver/MolLoaders/LoadAlphaFoldPlugin.vue";
import LoadPDBPlugin from "./Core/MolLoaderSaver/MolLoaders/LoadPDBPlugin.vue";
import LoadFilePlugin from "./Core/MolLoaderSaver/MolLoaders/LoadFilePlugin.vue";
import SavePDBMol2Plugin from "./Core/MolLoaderSaver/MolSaver/SavePDBMol2Plugin.vue";
import TestPlugin from "./Optional/TestPlugin.vue";

@Options({
  components: {
    AboutPlugin,
    LoadFilePlugin,
    LoadPDBPlugin,
    LoadAlphaFoldPlugin,
    LoadPubChemPlugin,
    SaveSessionPlugin,
    OpenSessionPlugin,
    SavePNGPlugin,
    SaveVRMLPlugin,
    SavePDBMol2Plugin,
    TestPlugin
  },
})
export default class AllPlugins extends Vue {
  @Prop({ required: true }) softwareCredits!: ISoftwareCredit[];
  @Prop({ required: true }) contributorCredits!: IContributorCredit[];

  onError(error: string) {
    this.$emit("onError", error);
  }

  onPluginSetup(pluginSetupInfo: IPluginSetupInfo) {
    // Relay up the chain (from individual plugins to app).
    this.$emit("onPluginSetup", pluginSetupInfo);
  }
}
</script>

<style scoped lang="scss">
</style>
