<!-- NOTE: Do not remove comments "TEMPLATE# START" and "TEMPLATE# END". Build
system uses these to autopopulate with plugins. -->
<template>
  <div>
    <AboutPlugin @onPluginSetup="onPluginSetup" :softwareCreditsToShow="softwareCredits" :contributorCreditsToShow="contributorCredits"/>

    <!-- TEMPLATE1 START -->
    <ClearSelectionPlugin @onPluginSetup="onPluginSetup"></ClearSelectionPlugin>
    <CloneExtractMolPlugin @onPluginSetup="onPluginSetup"></CloneExtractMolPlugin>
    <DelayedJobPopupPlugin @onPluginSetup="onPluginSetup"></DelayedJobPopupPlugin>
    <DeleteMolPlugin @onPluginSetup="onPluginSetup"></DeleteMolPlugin>
    <InformationWindowPlugin @onPluginSetup="onPluginSetup"></InformationWindowPlugin>
    <JobsWindowPlugin @onPluginSetup="onPluginSetup"></JobsWindowPlugin>
    <LoadAlphaFoldPlugin @onPluginSetup="onPluginSetup"></LoadAlphaFoldPlugin>
    <LoadPDBPlugin @onPluginSetup="onPluginSetup"></LoadPDBPlugin>
    <LoadPubChemPlugin @onPluginSetup="onPluginSetup"></LoadPubChemPlugin>
    <LogWindowPlugin @onPluginSetup="onPluginSetup"></LogWindowPlugin>
    <NavigatorWindowPlugin @onPluginSetup="onPluginSetup"></NavigatorWindowPlugin>
    <NewProjectPlugin @onPluginSetup="onPluginSetup"></NewProjectPlugin>
    <OpenMoleculesPlugin @onPluginSetup="onPluginSetup"></OpenMoleculesPlugin>
    <RedoPlugin @onPluginSetup="onPluginSetup"></RedoPlugin>
    <RenameMolPlugin @onPluginSetup="onPluginSetup"></RenameMolPlugin>
    <SaveMoleculesPlugin @onPluginSetup="onPluginSetup"></SaveMoleculesPlugin>
    <SavePNGPlugin @onPluginSetup="onPluginSetup"></SavePNGPlugin>
    <SaveVRMLPlugin @onPluginSetup="onPluginSetup"></SaveVRMLPlugin>
    <SimpleMsgPlugin @onPluginSetup="onPluginSetup"></SimpleMsgPlugin>
    <StylesWindowPlugin @onPluginSetup="onPluginSetup"></StylesWindowPlugin>
    <UndoPlugin @onPluginSetup="onPluginSetup"></UndoPlugin>
    <ViewerWindowPlugin @onPluginSetup="onPluginSetup"></ViewerWindowPlugin>

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
import DelayedJobPopupPlugin from "./Core/DelayedJobPopupPlugin.vue";
import DeleteMolPlugin from "./Core/EditBar/DeleteMolPlugin.vue";
import InformationWindowPlugin from "./Core/Window/InformationWindowPlugin.vue";
import JobsWindowPlugin from "./Core/Window/JobsWindowPlugin.vue";
import LoadAlphaFoldPlugin from "./Core/RemoteMolLoaders/LoadAlphaFoldPlugin.vue";
import LoadPDBPlugin from "./Core/RemoteMolLoaders/LoadPDBPlugin.vue";
import LoadPubChemPlugin from "./Core/RemoteMolLoaders/LoadPubChemPlugin.vue";
import LogWindowPlugin from "./Core/Window/LogWindowPlugin.vue";
import NavigatorWindowPlugin from "./Core/Window/NavigatorWindowPlugin.vue";
import NewProjectPlugin from "./Core/LocalMolLoadersSavers/NewProjectPlugin.vue";
import OpenMoleculesPlugin from "./Core/LocalMolLoadersSavers/OpenMoleculesPlugin.vue";
import RedoPlugin from "./Core/UndoRedo/RedoPlugin.vue";
import RenameMolPlugin from "./Core/EditBar/RenameMolPlugin.vue";
import SaveMoleculesPlugin from "./Core/LocalMolLoadersSavers/SaveMoleculesPlugin.vue";
import SavePNGPlugin from "./Core/Graphics/SavePNGPlugin.vue";
import SaveVRMLPlugin from "./Core/Graphics/SaveVRMLPlugin.vue";
import SimpleMsgPlugin from "./Core/SimpleMsgPlugin.vue";
import StylesWindowPlugin from "./Core/Window/StylesWindowPlugin.vue";
import UndoPlugin from "./Core/UndoRedo/UndoPlugin.vue";
import ViewerWindowPlugin from "./Core/Window/ViewerWindowPlugin.vue";

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
    DelayedJobPopupPlugin,
    DeleteMolPlugin,
    InformationWindowPlugin,
    JobsWindowPlugin,
    LoadAlphaFoldPlugin,
    LoadPDBPlugin,
    LoadPubChemPlugin,
    LogWindowPlugin,
    NavigatorWindowPlugin,
    NewProjectPlugin,
    OpenMoleculesPlugin,
    RedoPlugin,
    RenameMolPlugin,
    SaveMoleculesPlugin,
    SavePNGPlugin,
    SaveVRMLPlugin,
    SimpleMsgPlugin,
    StylesWindowPlugin,
    UndoPlugin,
    ViewerWindowPlugin,

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