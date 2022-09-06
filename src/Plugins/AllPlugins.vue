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
    <UndoPlugin @onPluginSetup="onPluginSetup"></UndoPlugin>
    <RedoPlugin @onPluginSetup="onPluginSetup"></RedoPlugin>
    <RenameMolPlugin @onPluginSetup="onPluginSetup"></RenameMolPlugin>
    <CloneExtractMolPlugin @onPluginSetup="onPluginSetup"></CloneExtractMolPlugin>
    <DeleteMolPlugin @onPluginSetup="onPluginSetup"></DeleteMolPlugin>
    <ClearSelectionPlugin @onPluginSetup="onPluginSetup"></ClearSelectionPlugin>
    <SimpleMsgPlugin @onPluginSetup="onPluginSetup"></SimpleMsgPlugin>
    <NewSessionPlugin @onPluginSetup="onPluginSetup"></NewSessionPlugin>
    
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
import UndoPlugin from "./Core/UndoRedo/UndoPlugin.vue";
import RedoPlugin from "./Core/UndoRedo/RedoPlugin.vue";
import RenameMolPlugin from "./Core/EditBar/RenameMol.vue";
import CloneExtractMolPlugin from "./Core/EditBar/CloneExtractMol.vue";
import DeleteMolPlugin from "./Core/EditBar/DeleteMol.vue";
import ClearSelectionPlugin from "./Core/EditBar/ClearSelection.vue";
import SimpleMsgPlugin from "./Core/SimpleMsg.vue";
import NewSessionPlugin from "./Core/SessionLoaderSaver/NewSessionPlugin.vue";

import TestPlugin from "./Optional/TestPlugin.vue";

/**
 * Component where all plugins are placed.
 */
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
    UndoPlugin,
    RedoPlugin,
    RenameMolPlugin,
    CloneExtractMolPlugin,
    DeleteMolPlugin,
    ClearSelectionPlugin,
    SimpleMsgPlugin,
    NewSessionPlugin,

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
