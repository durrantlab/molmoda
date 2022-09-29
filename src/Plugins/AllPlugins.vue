<!-- NOTE: Do not remove comments "TEMPLATE# START" and "TEMPLATE# END". Build
system uses these to autopopulate with plugins. -->
<template>
  <div>
    <AboutPlugin @onPluginSetup="onPluginSetup" :softwareCreditsToShow="softwareCredits" :contributorCreditsToShow="contributorCredits"/>

    <!-- TEMPLATE1 START -->
    <ClearSelectionPlugin @onPluginSetup="onPluginSetup"></ClearSelectionPlugin>
    <CloneExtractMolPlugin @onPluginSetup="onPluginSetup"></CloneExtractMolPlugin>
    <DeleteMolPlugin @onPluginSetup="onPluginSetup"></DeleteMolPlugin>
    <LoadAlphaFoldPlugin @onPluginSetup="onPluginSetup"></LoadAlphaFoldPlugin>
    <LoadFilePlugin @onPluginSetup="onPluginSetup"></LoadFilePlugin>
    <LoadPDBPlugin @onPluginSetup="onPluginSetup"></LoadPDBPlugin>
    <LoadPubChemPlugin @onPluginSetup="onPluginSetup"></LoadPubChemPlugin>
    <NewSessionPlugin @onPluginSetup="onPluginSetup"></NewSessionPlugin>
    <OpenSessionPlugin @onPluginSetup="onPluginSetup"></OpenSessionPlugin>
    <RedoPlugin @onPluginSetup="onPluginSetup"></RedoPlugin>
    <RenameMolPlugin @onPluginSetup="onPluginSetup"></RenameMolPlugin>
    <SavePDBMol2Plugin @onPluginSetup="onPluginSetup"></SavePDBMol2Plugin>
    <SavePNGPlugin @onPluginSetup="onPluginSetup"></SavePNGPlugin>
    <SaveSessionPlugin @onPluginSetup="onPluginSetup"></SaveSessionPlugin>
    <SaveVRMLPlugin @onPluginSetup="onPluginSetup"></SaveVRMLPlugin>
    <SimpleMsgPlugin @onPluginSetup="onPluginSetup"></SimpleMsgPlugin>
    <UndoPlugin @onPluginSetup="onPluginSetup"></UndoPlugin>

    <TestPlugin @onPluginSetup="onPluginSetup"></TestPlugin>
    <!-- TEMPLATE1 END -->




















  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { IContributorCredit, IPluginSetupInfo, ISoftwareCredit } from "./PluginInterfaces";

import AboutPlugin from "@/Plugins/Core/AboutPlugin.vue";

// TEMPLATE2 START
import ClearSelectionPlugin from "./Core/EditBar/ClearSelectionPlugin.vue";
import CloneExtractMolPlugin from "./Core/EditBar/CloneExtractMolPlugin.vue";
import DeleteMolPlugin from "./Core/EditBar/DeleteMolPlugin.vue";
import LoadAlphaFoldPlugin from "./Core/MolLoaderSaver/MolLoaders/LoadAlphaFoldPlugin.vue";
import LoadFilePlugin from "./Core/MolLoaderSaver/MolLoaders/LoadFilePlugin.vue";
import LoadPDBPlugin from "./Core/MolLoaderSaver/MolLoaders/LoadPDBPlugin.vue";
import LoadPubChemPlugin from "./Core/MolLoaderSaver/MolLoaders/LoadPubChemPlugin.vue";
import NewSessionPlugin from "./Core/SessionLoaderSaver/NewSessionPlugin.vue";
import OpenSessionPlugin from "./Core/SessionLoaderSaver/OpenSessionPlugin.vue";
import RedoPlugin from "./Core/UndoRedo/RedoPlugin.vue";
import RenameMolPlugin from "./Core/EditBar/RenameMolPlugin.vue";
import SavePDBMol2Plugin from "./Core/MolLoaderSaver/MolSaver/SavePDBMol2Plugin.vue";
import SavePNGPlugin from "./Core/MolLoaderSaver/MolSaver/SavePNGPlugin.vue";
import SaveSessionPlugin from "./Core/SessionLoaderSaver/SaveSessionPlugin.vue";
import SaveVRMLPlugin from "./Core/MolLoaderSaver/MolSaver/SaveVRMLPlugin.vue";
import SimpleMsgPlugin from "./Core/SimpleMsgPlugin.vue";
import UndoPlugin from "./Core/UndoRedo/UndoPlugin.vue";

import TestPlugin from "./Optional/TestPlugin.vue";
// TEMPLATE2 END





















/**
 * Component where all plugins are placed.
 */
@Options({
  components: {
    AboutPlugin,

    // TEMPLATE3 START
    ClearSelectionPlugin,
    CloneExtractMolPlugin,
    DeleteMolPlugin,
    LoadAlphaFoldPlugin,
    LoadFilePlugin,
    LoadPDBPlugin,
    LoadPubChemPlugin,
    NewSessionPlugin,
    OpenSessionPlugin,
    RedoPlugin,
    RenameMolPlugin,
    SavePDBMol2Plugin,
    SavePNGPlugin,
    SaveSessionPlugin,
    SaveVRMLPlugin,
    SimpleMsgPlugin,
    UndoPlugin,

    TestPlugin,
    // TEMPLATE3 END




















  },
})
export default class AllPlugins extends Vue {
  @Prop({ required: true }) softwareCredits!: ISoftwareCredit[];
  @Prop({ required: true }) contributorCredits!: IContributorCredit[];

  /**
   * Runs when the plugin is setup.
   * 
   * @param {IPluginSetupInfo} pluginSetupInfo  The plugin-setup parameters.
   */
  onPluginSetup(pluginSetupInfo: IPluginSetupInfo) {
    // Relay up the chain (from individual plugins to app).
    this.$emit("onPluginSetup", pluginSetupInfo);
  }
}
</script>

<style scoped lang="scss">
</style>