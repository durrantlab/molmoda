<!-- eslint-disable @typescript-eslint/ban-ts-comment -->
<!-- eslint-disable @typescript-eslint/ban-ts-comment -->
<!-- NOTE: Do not remove comments "TEMPLATE# START" and "TEMPLATE# END". Build
system uses these to autopopulate with plugins. -->
<template>
  <div>
    <AboutPlugin @onPluginSetup="onPluginSetup" :softwareCreditsToShow="softwareCredits" :contributorCreditsToShow="contributorCredits"/>
    <HelpPlugin @onPluginSetup="onPluginSetup" :loadedPlugins="loadedPlugins" />

    <!-- TEMPLATE1 START -->
    <ActivityFocusPlugin @onPluginSetup="onPluginSetup"></ActivityFocusPlugin>
    <ArchivedVersionsPlugin @onPluginSetup="onPluginSetup"></ArchivedVersionsPlugin>
    <ClearSelectionPlugin @onPluginSetup="onPluginSetup"></ClearSelectionPlugin>
    <CloneMolPlugin @onPluginSetup="onPluginSetup"></CloneMolPlugin>
    <CollapseAllPlugin @onPluginSetup="onPluginSetup"></CollapseAllPlugin>
    <CopyAsSmilesPlugin @onPluginSetup="onPluginSetup"></CopyAsSmilesPlugin>
    <CopyPlugin @onPluginSetup="onPluginSetup"></CopyPlugin>
    <DataWindowPlugin @onPluginSetup="onPluginSetup"></DataWindowPlugin>
    <DeleteMolPlugin @onPluginSetup="onPluginSetup"></DeleteMolPlugin>
    <DocumentationLinkPlugin @onPluginSetup="onPluginSetup"></DocumentationLinkPlugin>
    <DownTreeNavPlugin @onPluginSetup="onPluginSetup"></DownTreeNavPlugin>
    <DrawMoleculePlugin @onPluginSetup="onPluginSetup"></DrawMoleculePlugin>
    <EditCompoundPlugin @onPluginSetup="onPluginSetup"></EditCompoundPlugin>
    <ErrorReportingPlugin @onPluginSetup="onPluginSetup"></ErrorReportingPlugin>
    <ExampleDataPlugin @onPluginSetup="onPluginSetup"></ExampleDataPlugin>
    <ExpandAllPlugin @onPluginSetup="onPluginSetup"></ExpandAllPlugin>
    <FetcherPermissionPlugin @onPluginSetup="onPluginSetup"></FetcherPermissionPlugin>
    <InformationWindowPlugin @onPluginSetup="onPluginSetup"></InformationWindowPlugin>
    <JobsWindowPlugin @onPluginSetup="onPluginSetup"></JobsWindowPlugin>
    <LoadAlphaFoldPlugin @onPluginSetup="onPluginSetup"></LoadAlphaFoldPlugin>
    <LoadPDBPlugin @onPluginSetup="onPluginSetup"></LoadPDBPlugin>
    <LoadPubChemPlugin @onPluginSetup="onPluginSetup"></LoadPubChemPlugin>
    <LogWindowPlugin @onPluginSetup="onPluginSetup"></LogWindowPlugin>
    <MergeMolsPlugin @onPluginSetup="onPluginSetup"></MergeMolsPlugin>
    <MolTextPlugin @onPluginSetup="onPluginSetup"></MolTextPlugin>
    <MoveRegionsOnClickPlugin @onPluginSetup="onPluginSetup"></MoveRegionsOnClickPlugin>
    <NavigatorWindowPlugin @onPluginSetup="onPluginSetup"></NavigatorWindowPlugin>
    <NewProjectPlugin @onPluginSetup="onPluginSetup"></NewProjectPlugin>
    <OpenMoleculesPlugin @onPluginSetup="onPluginSetup"></OpenMoleculesPlugin>
    <PastePlugin @onPluginSetup="onPluginSetup"></PastePlugin>
    <QuitPlugin @onPluginSetup="onPluginSetup"></QuitPlugin>
    <RedoPlugin @onPluginSetup="onPluginSetup"></RedoPlugin>
    <RenameMolPlugin @onPluginSetup="onPluginSetup"></RenameMolPlugin>
    <SaveMoleculesPlugin @onPluginSetup="onPluginSetup"></SaveMoleculesPlugin>
    <SelectAllPlugin @onPluginSetup="onPluginSetup"></SelectAllPlugin>
    <SelectInvertPlugin @onPluginSetup="onPluginSetup"></SelectInvertPlugin>
    <SettingsPlugin @onPluginSetup="onPluginSetup"></SettingsPlugin>
    <SimpleMsgPlugin @onPluginSetup="onPluginSetup"></SimpleMsgPlugin>
    <SimpleSVGPlugin @onPluginSetup="onPluginSetup"></SimpleSVGPlugin>
    <SimpleTableDataPlugin @onPluginSetup="onPluginSetup"></SimpleTableDataPlugin>
    <SimpleVideoPlugin @onPluginSetup="onPluginSetup"></SimpleVideoPlugin>
    <StatCollectionPlugin @onPluginSetup="onPluginSetup"></StatCollectionPlugin>
    <StylesWindowPlugin @onPluginSetup="onPluginSetup"></StylesWindowPlugin>
    <ToggleVisiblePlugin @onPluginSetup="onPluginSetup"></ToggleVisiblePlugin>
    <UndoPlugin @onPluginSetup="onPluginSetup"></UndoPlugin>
    <UpTreeNavPlugin @onPluginSetup="onPluginSetup"></UpTreeNavPlugin>
    <ViewerWindowPlugin @onPluginSetup="onPluginSetup"></ViewerWindowPlugin>
    <YesNoPlugin @onPluginSetup="onPluginSetup"></YesNoPlugin>

    <AddRegionPlugin @onPluginSetup="onPluginSetup"></AddRegionPlugin>
    <EvalScreenPlugin @onPluginSetup="onPluginSetup"></EvalScreenPlugin>
    <FPocketWebPlugin @onPluginSetup="onPluginSetup"></FPocketWebPlugin>
    <PoseViewPlugin @onPluginSetup="onPluginSetup"></PoseViewPlugin>
    <ProtonateCompoundsPlugin @onPluginSetup="onPluginSetup"></ProtonateCompoundsPlugin>
    <PubChemBioassaysPlugin @onPluginSetup="onPluginSetup"></PubChemBioassaysPlugin>
    <PubChemFocusedLibraryPlugin @onPluginSetup="onPluginSetup"></PubChemFocusedLibraryPlugin>
    <PubChemNamesPlugin @onPluginSetup="onPluginSetup"></PubChemNamesPlugin>
    <PubChemPropsPlugin @onPluginSetup="onPluginSetup"></PubChemPropsPlugin>
    <ReducePlugin @onPluginSetup="onPluginSetup"></ReducePlugin>
    <SavePNGPlugin @onPluginSetup="onPluginSetup"></SavePNGPlugin>
    <SaveVRMLPlugin @onPluginSetup="onPluginSetup"></SaveVRMLPlugin>
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
import ActivityFocusPlugin from "./Core/ActivityFocus/ActivityFocusPlugin.vue";
import ArchivedVersionsPlugin from "./Core/ArchivedVersionsPlugin.vue";
import ClearSelectionPlugin from "./Core/EditBar/ClearSelectionPlugin.vue";
import CloneMolPlugin from "./Core/EditBar/CloneMolPlugin.vue";
import CollapseAllPlugin from "./Core/CollapseAllPlugin.vue";
import CopyAsSmilesPlugin from "./Core/Clipboard/CopyAsSmilesPlugin.vue";
import CopyPlugin from "./Core/Clipboard/CopyPlugin.vue";
import DataWindowPlugin from "./Core/Window/DataWindowPlugin.vue";
import DeleteMolPlugin from "./Core/EditBar/DeleteMolPlugin.vue";
import DocumentationLinkPlugin from "./Core/DocumentationLinkPlugin.vue";
import DownTreeNavPlugin from "./Core/UpDownTreeNav/DownTreeNavPlugin.vue";
import DrawMoleculePlugin from "./Core/DrawMoleculePlugin.vue";
import EditCompoundPlugin from "./Core/EditCompoundPlugin.vue";
import ErrorReportingPlugin from "./Core/ErrorReporting/ErrorReportingPlugin.vue";
import ExampleDataPlugin from "./Core/LocalMolLoadersSavers/ExampleDataPlugin.vue";
import ExpandAllPlugin from "./Core/ExpandAllPlugin.vue";
import FetcherPermissionPlugin from "./Core/FetcherPermissionPlugin.vue";
import InformationWindowPlugin from "./Core/Window/InformationWindowPlugin.vue";
import JobsWindowPlugin from "./Core/Window/JobsWindowPlugin.vue";
import LoadAlphaFoldPlugin from "./Core/RemoteMolLoaders/LoadAlphaFoldPlugin.vue";
import LoadPDBPlugin from "./Core/RemoteMolLoaders/LoadPDBPlugin.vue";
import LoadPubChemPlugin from "./Core/RemoteMolLoaders/LoadPubChemPlugin.vue";
import LogWindowPlugin from "./Core/Window/LogWindowPlugin.vue";
import MergeMolsPlugin from "./Core/EditBar/MergeMolsPlugin.vue";
import MolTextPlugin from "./Core/MolTextPlugin.vue";
import MoveRegionsOnClickPlugin from "./Core/MoveRegionsOnClickPlugin.vue";
import NavigatorWindowPlugin from "./Core/Window/NavigatorWindowPlugin.vue";
import NewProjectPlugin from "./Core/LocalMolLoadersSavers/NewProjectPlugin.vue";
import OpenMoleculesPlugin from "./Core/LocalMolLoadersSavers/OpenMoleculesPlugin.vue";
import PastePlugin from "./Core/Clipboard/PastePlugin.vue";
import QuitPlugin from "./Core/QuitPlugin.vue";
import RedoPlugin from "./Core/UndoRedo/RedoPlugin.vue";
import RenameMolPlugin from "./Core/EditBar/RenameMolPlugin.vue";
import SaveMoleculesPlugin from "./Core/LocalMolLoadersSavers/SaveMoleculesPlugin.vue";
import SelectAllPlugin from "./Core/SelectAllPlugin.vue";
import SelectInvertPlugin from "./Core/SelectInvertPlugin.vue";
import SettingsPlugin from "./Core/Settings/SettingsPlugin.vue";
import SimpleMsgPlugin from "./Core/SimpleMsgPlugin.vue";
import SimpleSVGPlugin from "./Core/SimpleSVGPlugin.vue";
import SimpleTableDataPlugin from "./Core/SimpleTableDataPlugin.vue";
import SimpleVideoPlugin from "./Core/SimpleVideoPlugin.vue";
import StatCollectionPlugin from "./Core/StatCollection/StatCollectionPlugin.vue";
import StylesWindowPlugin from "./Core/Window/StylesWindowPlugin.vue";
import ToggleVisiblePlugin from "./Core/EditBar/ToggleVisiblePlugin.vue";
import UndoPlugin from "./Core/UndoRedo/UndoPlugin.vue";
import UpTreeNavPlugin from "./Core/UpDownTreeNav/UpTreeNavPlugin.vue";
import ViewerWindowPlugin from "./Core/Window/ViewerWindowPlugin.vue";
import YesNoPlugin from "./Core/YesNoPlugin.vue";

import AddRegionPlugin from "./Optional/AddRegionPlugin.vue";
import EvalScreenPlugin from "./Optional/EvalScreenPlugin.vue";
import FPocketWebPlugin from "./Optional/FPocketWeb/FPocketWebPlugin.vue";
import PoseViewPlugin from "./Optional/PoseViewPlugin.vue";
import ProtonateCompoundsPlugin from "./Optional/ProtonateCompounds/ProtonateCompoundsPlugin.vue";
import PubChemBioassaysPlugin from "./Optional/PubChem/PubChemBioassaysPlugin.vue";
import PubChemFocusedLibraryPlugin from "./Optional/PubChem/PubChemFocusedLibraryPlugin.vue";
import PubChemNamesPlugin from "./Optional/PubChem/PubChemNamesPlugin.vue";
import PubChemPropsPlugin from "./Optional/PubChem/PubChemPropsPlugin.vue";
import ReducePlugin from "./Optional/Reduce/ReducePlugin.vue";
import SavePNGPlugin from "./Optional/Graphics/SavePNGPlugin.vue";
import SaveVRMLPlugin from "./Optional/Graphics/SaveVRMLPlugin.vue";
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
    ActivityFocusPlugin,
    ArchivedVersionsPlugin,
    ClearSelectionPlugin,
    CloneMolPlugin,
    CollapseAllPlugin,
    CopyAsSmilesPlugin,
    CopyPlugin,
    DataWindowPlugin,
    DeleteMolPlugin,
    DocumentationLinkPlugin,
    DownTreeNavPlugin,
    DrawMoleculePlugin,
    EditCompoundPlugin,
    ErrorReportingPlugin,
    ExampleDataPlugin,
    ExpandAllPlugin,
    FetcherPermissionPlugin,
    InformationWindowPlugin,
    JobsWindowPlugin,
    LoadAlphaFoldPlugin,
    LoadPDBPlugin,
    LoadPubChemPlugin,
    LogWindowPlugin,
    MergeMolsPlugin,
    MolTextPlugin,
    MoveRegionsOnClickPlugin,
    NavigatorWindowPlugin,
    NewProjectPlugin,
    OpenMoleculesPlugin,
    PastePlugin,
    QuitPlugin,
    RedoPlugin,
    RenameMolPlugin,
    SaveMoleculesPlugin,
    SelectAllPlugin,
    SelectInvertPlugin,
    SettingsPlugin,
    SimpleMsgPlugin,
    SimpleSVGPlugin,
    SimpleTableDataPlugin,
    SimpleVideoPlugin,
    StatCollectionPlugin,
    StylesWindowPlugin,
    ToggleVisiblePlugin,
    UndoPlugin,
    UpTreeNavPlugin,
    ViewerWindowPlugin,
    YesNoPlugin,

    AddRegionPlugin,
    EvalScreenPlugin,
    FPocketWebPlugin,
    PoseViewPlugin,
    ProtonateCompoundsPlugin,
    PubChemBioassaysPlugin,
    PubChemFocusedLibraryPlugin,
    PubChemNamesPlugin,
    PubChemPropsPlugin,
    ReducePlugin,
    SavePNGPlugin,
    SaveVRMLPlugin,
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