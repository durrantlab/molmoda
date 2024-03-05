<!-- eslint-disable @typescript-eslint/ban-ts-comment -->
<!-- eslint-disable @typescript-eslint/ban-ts-comment -->
<!-- NOTE: Do not remove comments "TEMPLATE# START" and "TEMPLATE# END". Build
system uses these to autopopulate with plugins. -->
<template>
  <div>
    <AboutPlugin @onPluginSetup="onPluginSetup" :softwareCreditsToShow="softwareCredits" :contributorCreditsToShow="contributorCredits"/>
    <HelpPlugin @onPluginSetup="onPluginSetup" :loadedPlugins="loadedPlugins" />

    <!-- TEMPLATE1 START -->
    <ClearSelectionPlugin @onPluginSetup="onPluginSetup"></ClearSelectionPlugin>
    <CloneMolPlugin @onPluginSetup="onPluginSetup"></CloneMolPlugin>
    <CollapseAllPlugin @onPluginSetup="onPluginSetup"></CollapseAllPlugin>
    <CopyPlugin @onPluginSetup="onPluginSetup"></CopyPlugin>
    <DataWindowPlugin @onPluginSetup="onPluginSetup"></DataWindowPlugin>
    <DeleteMolPlugin @onPluginSetup="onPluginSetup"></DeleteMolPlugin>
    <ErrorReportingPlugin @onPluginSetup="onPluginSetup"></ErrorReportingPlugin>
    <ExampleDataPlugin @onPluginSetup="onPluginSetup"></ExampleDataPlugin>
    <ExpandAllPlugin @onPluginSetup="onPluginSetup"></ExpandAllPlugin>
    <InformationWindowPlugin @onPluginSetup="onPluginSetup"></InformationWindowPlugin>
    <JobsWindowPlugin @onPluginSetup="onPluginSetup"></JobsWindowPlugin>
    <LoadAlphaFoldPlugin @onPluginSetup="onPluginSetup"></LoadAlphaFoldPlugin>
    <LoadPDBPlugin @onPluginSetup="onPluginSetup"></LoadPDBPlugin>
    <LoadPubChemPlugin @onPluginSetup="onPluginSetup"></LoadPubChemPlugin>
    <LogWindowPlugin @onPluginSetup="onPluginSetup"></LogWindowPlugin>
    <MergeMolsPlugin @onPluginSetup="onPluginSetup"></MergeMolsPlugin>
    <MoveRegionsOnClickPlugin @onPluginSetup="onPluginSetup"></MoveRegionsOnClickPlugin>
    <NavigatorWindowPlugin @onPluginSetup="onPluginSetup"></NavigatorWindowPlugin>
    <NewProjectPlugin @onPluginSetup="onPluginSetup"></NewProjectPlugin>
    <OpenMoleculesPlugin @onPluginSetup="onPluginSetup"></OpenMoleculesPlugin>
    <PastePlugin @onPluginSetup="onPluginSetup"></PastePlugin>
    <RedoPlugin @onPluginSetup="onPluginSetup"></RedoPlugin>
    <RenameMolPlugin @onPluginSetup="onPluginSetup"></RenameMolPlugin>
    <SaveMoleculesPlugin @onPluginSetup="onPluginSetup"></SaveMoleculesPlugin>
    <SavePNGPlugin @onPluginSetup="onPluginSetup"></SavePNGPlugin>
    <SaveVRMLPlugin @onPluginSetup="onPluginSetup"></SaveVRMLPlugin>
    <SelectAllPlugin @onPluginSetup="onPluginSetup"></SelectAllPlugin>
    <SelectInvertPlugin @onPluginSetup="onPluginSetup"></SelectInvertPlugin>
    <SettingsPlugin @onPluginSetup="onPluginSetup"></SettingsPlugin>
    <SimpleMsgPlugin @onPluginSetup="onPluginSetup"></SimpleMsgPlugin>
    <SimpleVideoPlugin @onPluginSetup="onPluginSetup"></SimpleVideoPlugin>
    <StatCollectionPlugin @onPluginSetup="onPluginSetup"></StatCollectionPlugin>
    <StylesWindowPlugin @onPluginSetup="onPluginSetup"></StylesWindowPlugin>
    <ToggleVisiblePlugin @onPluginSetup="onPluginSetup"></ToggleVisiblePlugin>
    <UndoPlugin @onPluginSetup="onPluginSetup"></UndoPlugin>
    <VideoTutorialsPlugin @onPluginSetup="onPluginSetup"></VideoTutorialsPlugin>
    <ViewerWindowPlugin @onPluginSetup="onPluginSetup"></ViewerWindowPlugin>

    <AddRegionPlugin @onPluginSetup="onPluginSetup"></AddRegionPlugin>
    <DrawMoleculePlugin @onPluginSetup="onPluginSetup"></DrawMoleculePlugin>
    <FPocketWebPlugin @onPluginSetup="onPluginSetup"></FPocketWebPlugin>
    <MolTextPlugin @onPluginSetup="onPluginSetup"></MolTextPlugin>
    <ProtonateCompoundsPlugin @onPluginSetup="onPluginSetup"></ProtonateCompoundsPlugin>
    <ReducePlugin @onPluginSetup="onPluginSetup"></ReducePlugin>
    <WebinaPlugin @onPluginSetup="onPluginSetup"></WebinaPlugin>
    <!-- TEMPLATE1 END -->
  </div>
</template>

<script lang="ts">
import { Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { Options } from "vue-class-component";
import { IContributorCredit, IPluginSetupInfo, ISoftwareCredit } from "./PluginInterfaces";
import { PluginParentClass } from "./Parents/PluginParentClass/PluginParentClass";

import AboutPlugin from "@/Plugins/Core/AboutPlugin.vue";
import HelpPlugin from "@/Plugins/Core/HelpPlugin.vue";

// TEMPLATE2 START
import ClearSelectionPlugin from "./Core/EditBar/ClearSelectionPlugin.vue";
import CloneMolPlugin from "./Core/EditBar/CloneMolPlugin.vue";
import CollapseAllPlugin from "./Core/CollapseAllPlugin.vue";
import CopyPlugin from "./Core/Clipboard/CopyPlugin.vue";
import DataWindowPlugin from "./Core/Window/DataWindowPlugin.vue";
import DeleteMolPlugin from "./Core/EditBar/DeleteMolPlugin.vue";
import ErrorReportingPlugin from "./Core/ErrorReporting/ErrorReportingPlugin.vue";
import ExampleDataPlugin from "./Core/LocalMolLoadersSavers/ExampleDataPlugin.vue";
import ExpandAllPlugin from "./Core/ExpandAllPlugin.vue";
import InformationWindowPlugin from "./Core/Window/InformationWindowPlugin.vue";
import JobsWindowPlugin from "./Core/Window/JobsWindowPlugin.vue";
import LoadAlphaFoldPlugin from "./Core/RemoteMolLoaders/LoadAlphaFoldPlugin.vue";
import LoadPDBPlugin from "./Core/RemoteMolLoaders/LoadPDBPlugin.vue";
import LoadPubChemPlugin from "./Core/RemoteMolLoaders/LoadPubChemPlugin.vue";
import LogWindowPlugin from "./Core/Window/LogWindowPlugin.vue";
import MergeMolsPlugin from "./Core/EditBar/MergeMolsPlugin.vue";
import MoveRegionsOnClickPlugin from "./Core/MoveRegionsOnClickPlugin.vue";
import NavigatorWindowPlugin from "./Core/Window/NavigatorWindowPlugin.vue";
import NewProjectPlugin from "./Core/LocalMolLoadersSavers/NewProjectPlugin.vue";
import OpenMoleculesPlugin from "./Core/LocalMolLoadersSavers/OpenMoleculesPlugin.vue";
import PastePlugin from "./Core/Clipboard/PastePlugin.vue";
import RedoPlugin from "./Core/UndoRedo/RedoPlugin.vue";
import RenameMolPlugin from "./Core/EditBar/RenameMolPlugin.vue";
import SaveMoleculesPlugin from "./Core/LocalMolLoadersSavers/SaveMoleculesPlugin.vue";
import SavePNGPlugin from "./Core/Graphics/SavePNGPlugin.vue";
import SaveVRMLPlugin from "./Core/Graphics/SaveVRMLPlugin.vue";
import SelectAllPlugin from "./Core/SelectAllPlugin.vue";
import SelectInvertPlugin from "./Core/SelectInvertPlugin.vue";
import SettingsPlugin from "./Core/Settings/SettingsPlugin.vue";
import SimpleMsgPlugin from "./Core/SimpleMsgPlugin.vue";
import SimpleVideoPlugin from "./Core/SimpleVideoPlugin.vue";
import StatCollectionPlugin from "./Core/StatCollection/StatCollectionPlugin.vue";
import StylesWindowPlugin from "./Core/Window/StylesWindowPlugin.vue";
import ToggleVisiblePlugin from "./Core/EditBar/ToggleVisiblePlugin.vue";
import UndoPlugin from "./Core/UndoRedo/UndoPlugin.vue";
import VideoTutorialsPlugin from "./Core/VideoTutorialsPlugin.vue";
import ViewerWindowPlugin from "./Core/Window/ViewerWindowPlugin.vue";

import AddRegionPlugin from "./Optional/AddRegionPlugin.vue";
import DrawMoleculePlugin from "./Optional/DrawMoleculePlugin.vue";
import FPocketWebPlugin from "./Optional/FPocketWeb/FPocketWebPlugin.vue";
import MolTextPlugin from "./Optional/MolTextPlugin.vue";
import ProtonateCompoundsPlugin from "./Optional/ProtonateCompounds/ProtonateCompoundsPlugin.vue";
import ReducePlugin from "./Optional/Reduce/ReducePlugin.vue";
import WebinaPlugin from "./Optional/Webina/WebinaPlugin.vue";
// TEMPLATE2 END

/**
 * Component where all plugins are placed.
 */
@Options({
  components: {
    AboutPlugin,
    HelpPlugin,

    // TEMPLATE3 START
    ClearSelectionPlugin,
    CloneMolPlugin,
    CollapseAllPlugin,
    CopyPlugin,
    DataWindowPlugin,
    DeleteMolPlugin,
    ErrorReportingPlugin,
    ExampleDataPlugin,
    ExpandAllPlugin,
    InformationWindowPlugin,
    JobsWindowPlugin,
    LoadAlphaFoldPlugin,
    LoadPDBPlugin,
    LoadPubChemPlugin,
    LogWindowPlugin,
    MergeMolsPlugin,
    MoveRegionsOnClickPlugin,
    NavigatorWindowPlugin,
    NewProjectPlugin,
    OpenMoleculesPlugin,
    PastePlugin,
    RedoPlugin,
    RenameMolPlugin,
    SaveMoleculesPlugin,
    SavePNGPlugin,
    SaveVRMLPlugin,
    SelectAllPlugin,
    SelectInvertPlugin,
    SettingsPlugin,
    SimpleMsgPlugin,
    SimpleVideoPlugin,
    StatCollectionPlugin,
    StylesWindowPlugin,
    ToggleVisiblePlugin,
    UndoPlugin,
    VideoTutorialsPlugin,
    ViewerWindowPlugin,

    AddRegionPlugin,
    DrawMoleculePlugin,
    FPocketWebPlugin,
    MolTextPlugin,
    ProtonateCompoundsPlugin,
    ReducePlugin,
    WebinaPlugin,
    // TEMPLATE3 END

  },
})
export default class AllPlugins extends Vue {
  @Prop({ required: true }) softwareCredits!: ISoftwareCredit[];
  @Prop({ required: true }) contributorCredits!: IContributorCredit[];
  @Prop({ required: true }) loadedPlugins!: PluginParentClass[];

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