<template>
  <div>
    <AboutPlugin @onPluginSetup="onPluginSetup" :softwareCreditsToShow="softwareCredits" :contributorCreditsToShow="contributorCredits"/>
    <LoadFilePlugin @onPluginSetup="onPluginSetup"></LoadFilePlugin>
    <LoadPDBPlugin @onPluginSetup="onPluginSetup"></LoadPDBPlugin>
    <LoadAlphaFoldPlugin @onPluginSetup="onPluginSetup"></LoadAlphaFoldPlugin>
    <LoadPubChemPlugin @onPluginSetup="onPluginSetup"></LoadPubChemPlugin>
    <SaveSessionPlugin @onPluginSetup="onPluginSetup"></SaveSessionPlugin>
    <OpenSessionPlugin @onPluginSetup="onPluginSetup"></OpenSessionPlugin>
    <SavePNGPlugin @onPluginSetup="onPluginSetup"></SavePNGPlugin>
    <SaveVRMLPlugin @onPluginSetup="onPluginSetup"></SaveVRMLPlugin>
    <SavePDBMol2Plugin @onPluginSetup="onPluginSetup"></SavePDBMol2Plugin>
    <Undo @onPluginSetup="onPluginSetup"></Undo>
    <Redo @onPluginSetup="onPluginSetup"></Redo>
    <RenameMol @onPluginSetup="onPluginSetup"></RenameMol>
    <CloneExtractMol @onPluginSetup="onPluginSetup"></CloneExtractMol>
    <DeleteMol @onPluginSetup="onPluginSetup"></DeleteMol>
    <ClearSelection @onPluginSetup="onPluginSetup"></ClearSelection>
    <SimpleMsg @onPluginSetup="onPluginSetup"></SimpleMsg>
    
    <TestPlugin @onPluginSetup="onPluginSetup"></TestPlugin>
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
import Undo from "./Core/UndoRedo/Undo.vue";
import Redo from "./Core/UndoRedo/Redo.vue";
import RenameMol from "./Core/EditBar/RenameMol.vue";
import CloneExtractMol from "./Core/EditBar/CloneExtractMol.vue";
import DeleteMol from "./Core/EditBar/DeleteMol.vue";
import ClearSelection from "./Core/EditBar/ClearSelection.vue";
import SimpleMsg from "./Core/SimpleMsg.vue";

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
    Undo,
    Redo,
    RenameMol,
    CloneExtractMol,
    DeleteMol,
    ClearSelection,
    SimpleMsg,

    TestPlugin
  },
})
export default class AllPlugins extends Vue {
  @Prop({ required: true }) softwareCredits!: ISoftwareCredit[];
  @Prop({ required: true }) contributorCredits!: IContributorCredit[];

  onPluginSetup(pluginSetupInfo: IPluginSetupInfo) {
    // Relay up the chain (from individual plugins to app).
    this.$emit("onPluginSetup", pluginSetupInfo);
  }
}
</script>

<style scoped lang="scss">
</style>
