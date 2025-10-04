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
    <AddVizualizationPlugin @onPluginSetup="onPluginSetup"></AddVizualizationPlugin>
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
    <RenameProjectPlugin @onPluginSetup="onPluginSetup"></RenameProjectPlugin>
    <ResetLayoutPlugin @onPluginSetup="onPluginSetup"></ResetLayoutPlugin>
    <SaveMoleculesPlugin @onPluginSetup="onPluginSetup"></SaveMoleculesPlugin>
    <SelectAllPlugin @onPluginSetup="onPluginSetup"></SelectAllPlugin>
    <SelectInvertPlugin @onPluginSetup="onPluginSetup"></SelectInvertPlugin>
    <SettingsPlugin @onPluginSetup="onPluginSetup"></SettingsPlugin>
    <SimpleMsgPlugin @onPluginSetup="onPluginSetup"></SimpleMsgPlugin>
    <SimpleSVGPopupPlugin @onPluginSetup="onPluginSetup"></SimpleSVGPopupPlugin>
    <SimpleTableDataPlugin @onPluginSetup="onPluginSetup"></SimpleTableDataPlugin>
    <SimpleVideoPlugin @onPluginSetup="onPluginSetup"></SimpleVideoPlugin>
    <StatCollectionPlugin @onPluginSetup="onPluginSetup"></StatCollectionPlugin>
    <StylesWindowPlugin @onPluginSetup="onPluginSetup"></StylesWindowPlugin>
    <TemporarySharePlugin @onPluginSetup="onPluginSetup"></TemporarySharePlugin>
    <ToggleVisiblePlugin @onPluginSetup="onPluginSetup"></ToggleVisiblePlugin>
    <TourPlugin @onPluginSetup="onPluginSetup"></TourPlugin>
    <UndoPlugin @onPluginSetup="onPluginSetup"></UndoPlugin>
    <UpTreeNavPlugin @onPluginSetup="onPluginSetup"></UpTreeNavPlugin>
    <ViewerWindowPlugin @onPluginSetup="onPluginSetup"></ViewerWindowPlugin>
    <YesNoPlugin @onPluginSetup="onPluginSetup"></YesNoPlugin>

    <AddRegionPlugin @onPluginSetup="onPluginSetup"></AddRegionPlugin>
    <AlignProteinsPlugin @onPluginSetup="onPluginSetup"></AlignProteinsPlugin>
    <EvalScreenPlugin @onPluginSetup="onPluginSetup"></EvalScreenPlugin>
    <FPocketWebPlugin @onPluginSetup="onPluginSetup"></FPocketWebPlugin>
    <FindSimilarProteinsPlugin @onPluginSetup="onPluginSetup"></FindSimilarProteinsPlugin>
    <PoseViewPlugin @onPluginSetup="onPluginSetup"></PoseViewPlugin>
    <ProtonateCompoundsPlugin @onPluginSetup="onPluginSetup"></ProtonateCompoundsPlugin>
    <PubChemBioassaysPlugin @onPluginSetup="onPluginSetup"></PubChemBioassaysPlugin>
    <PubChemFindSimilarPlugin @onPluginSetup="onPluginSetup"></PubChemFindSimilarPlugin>
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
import { defineAsyncComponent } from "vue";
import { IContributorCredit, IPluginSetupInfo, ISoftwareCredit } from "./PluginInterfaces";
import { PluginParentClass } from "./Parents/PluginParentClass/PluginParentClass";
// TEMPLATE2 START
// TEMPLATE2 END
/**
 * Component where all plugins are placed.
 */
@Options({
  components: {
    AboutPlugin: defineAsyncComponent(() => import("@/Plugins/Core/AboutPlugin.vue")),
    HelpPlugin: defineAsyncComponent(() => import("@/Plugins/Core/HelpPlugin.vue")),
 // TEMPLATE3 START
    ActivityFocusPlugin: defineAsyncComponent(() => import("@/Plugins/Core/ActivityFocus/ActivityFocusPlugin.vue")),
    AddVizualizationPlugin: defineAsyncComponent(() => import("@/Plugins/Core/AddVizualizationPlugin.vue")),
    ArchivedVersionsPlugin: defineAsyncComponent(() => import("@/Plugins/Core/ArchivedVersionsPlugin.vue")),
    ClearSelectionPlugin: defineAsyncComponent(() => import("@/Plugins/Core/EditBar/ClearSelectionPlugin.vue")),
    CloneMolPlugin: defineAsyncComponent(() => import("@/Plugins/Core/EditBar/CloneMolPlugin.vue")),
    CollapseAllPlugin: defineAsyncComponent(() => import("@/Plugins/Core/CollapseAllPlugin.vue")),
    CopyAsSmilesPlugin: defineAsyncComponent(() => import("@/Plugins/Core/Clipboard/CopyAsSmilesPlugin.vue")),
    CopyPlugin: defineAsyncComponent(() => import("@/Plugins/Core/Clipboard/CopyPlugin.vue")),
    DataWindowPlugin: defineAsyncComponent(() => import("@/Plugins/Core/Window/DataWindowPlugin.vue")),
    DeleteMolPlugin: defineAsyncComponent(() => import("@/Plugins/Core/EditBar/DeleteMolPlugin.vue")),
    DocumentationLinkPlugin: defineAsyncComponent(() => import("@/Plugins/Core/DocumentationLinkPlugin.vue")),
    DownTreeNavPlugin: defineAsyncComponent(() => import("@/Plugins/Core/UpDownTreeNav/DownTreeNavPlugin.vue")),
    DrawMoleculePlugin: defineAsyncComponent(() => import("@/Plugins/Core/DrawMoleculePlugin.vue")),
    EditCompoundPlugin: defineAsyncComponent(() => import("@/Plugins/Core/EditCompoundPlugin.vue")),
    ErrorReportingPlugin: defineAsyncComponent(() => import("@/Plugins/Core/ErrorReporting/ErrorReportingPlugin.vue")),
    ExampleDataPlugin: defineAsyncComponent(() => import("@/Plugins/Core/LocalMolLoadersSavers/ExampleDataPlugin.vue")),
    ExpandAllPlugin: defineAsyncComponent(() => import("@/Plugins/Core/ExpandAllPlugin.vue")),
    FetcherPermissionPlugin: defineAsyncComponent(() => import("@/Plugins/Core/FetcherPermissionPlugin.vue")),
    InformationWindowPlugin: defineAsyncComponent(() => import("@/Plugins/Core/Window/InformationWindowPlugin.vue")),
    JobsWindowPlugin: defineAsyncComponent(() => import("@/Plugins/Core/Window/JobsWindowPlugin.vue")),
    LoadAlphaFoldPlugin: defineAsyncComponent(() => import("@/Plugins/Core/RemoteMolLoaders/LoadAlphaFoldPlugin.vue")),
    LoadPDBPlugin: defineAsyncComponent(() => import("@/Plugins/Core/RemoteMolLoaders/LoadPDBPlugin.vue")),
    LoadPubChemPlugin: defineAsyncComponent(() => import("@/Plugins/Core/RemoteMolLoaders/LoadPubChemPlugin.vue")),
    LogWindowPlugin: defineAsyncComponent(() => import("@/Plugins/Core/Window/LogWindowPlugin.vue")),
    MergeMolsPlugin: defineAsyncComponent(() => import("@/Plugins/Core/EditBar/MergeMolsPlugin.vue")),
    MolTextPlugin: defineAsyncComponent(() => import("@/Plugins/Core/MolTextPlugin.vue")),
    MoveRegionsOnClickPlugin: defineAsyncComponent(() => import("@/Plugins/Core/MoveRegionsOnClickPlugin.vue")),
    NavigatorWindowPlugin: defineAsyncComponent(() => import("@/Plugins/Core/Window/NavigatorWindowPlugin.vue")),
    NewProjectPlugin: defineAsyncComponent(() => import("@/Plugins/Core/LocalMolLoadersSavers/NewProjectPlugin.vue")),
    OpenMoleculesPlugin: defineAsyncComponent(() => import("@/Plugins/Core/LocalMolLoadersSavers/OpenMoleculesPlugin.vue")),
    PastePlugin: defineAsyncComponent(() => import("@/Plugins/Core/Clipboard/PastePlugin.vue")),
    QuitPlugin: defineAsyncComponent(() => import("@/Plugins/Core/QuitPlugin.vue")),
    RedoPlugin: defineAsyncComponent(() => import("@/Plugins/Core/UndoRedo/RedoPlugin.vue")),
    RenameMolPlugin: defineAsyncComponent(() => import("@/Plugins/Core/EditBar/RenameMolPlugin.vue")),
    RenameProjectPlugin: defineAsyncComponent(() => import("@/Plugins/Core/LocalMolLoadersSavers/RenameProjectPlugin.vue")),
    ResetLayoutPlugin: defineAsyncComponent(() => import("@/Plugins/Core/Window/ResetLayoutPlugin.vue")),
    SaveMoleculesPlugin: defineAsyncComponent(() => import("@/Plugins/Core/LocalMolLoadersSavers/SaveMoleculesPlugin.vue")),
    SelectAllPlugin: defineAsyncComponent(() => import("@/Plugins/Core/SelectAllPlugin.vue")),
    SelectInvertPlugin: defineAsyncComponent(() => import("@/Plugins/Core/SelectInvertPlugin.vue")),
    SettingsPlugin: defineAsyncComponent(() => import("@/Plugins/Core/Settings/SettingsPlugin.vue")),
    SimpleMsgPlugin: defineAsyncComponent(() => import("@/Plugins/Core/SimpleMsgPlugin.vue")),
    SimpleSVGPopupPlugin: defineAsyncComponent(() => import("@/Plugins/Core/SimpleSVGPopupPlugin.vue")),
    SimpleTableDataPlugin: defineAsyncComponent(() => import("@/Plugins/Core/SimpleTableDataPlugin.vue")),
    SimpleVideoPlugin: defineAsyncComponent(() => import("@/Plugins/Core/SimpleVideoPlugin.vue")),
    StatCollectionPlugin: defineAsyncComponent(() => import("@/Plugins/Core/StatCollection/StatCollectionPlugin.vue")),
    StylesWindowPlugin: defineAsyncComponent(() => import("@/Plugins/Core/Window/StylesWindowPlugin.vue")),
    TemporarySharePlugin: defineAsyncComponent(() => import("@/Plugins/Core/TemporaryShare/TemporarySharePlugin.vue")),
    ToggleVisiblePlugin: defineAsyncComponent(() => import("@/Plugins/Core/EditBar/ToggleVisiblePlugin.vue")),
    TourPlugin: defineAsyncComponent(() => import("@/Plugins/Core/Tour/TourPlugin.vue")),
    UndoPlugin: defineAsyncComponent(() => import("@/Plugins/Core/UndoRedo/UndoPlugin.vue")),
    UpTreeNavPlugin: defineAsyncComponent(() => import("@/Plugins/Core/UpDownTreeNav/UpTreeNavPlugin.vue")),
    ViewerWindowPlugin: defineAsyncComponent(() => import("@/Plugins/Core/Window/ViewerWindowPlugin.vue")),
    YesNoPlugin: defineAsyncComponent(() => import("@/Plugins/Core/YesNoPlugin.vue")),

    AddRegionPlugin: defineAsyncComponent(() => import("@/Plugins/Optional/AddRegionPlugin.vue")),
    AlignProteinsPlugin: defineAsyncComponent(() => import("@/Plugins/Optional/Align/AlignProteinsPlugin.vue")),
    EvalScreenPlugin: defineAsyncComponent(() => import("@/Plugins/Optional/EvalScreenPlugin.vue")),
    FPocketWebPlugin: defineAsyncComponent(() => import("@/Plugins/Optional/FPocketWeb/FPocketWebPlugin.vue")),
    FindSimilarProteinsPlugin: defineAsyncComponent(() => import("@/Plugins/Optional/FindSimilarProteins/FindSimilarProteinsPlugin.vue")),
    PoseViewPlugin: defineAsyncComponent(() => import("@/Plugins/Optional/PoseViewPlugin.vue")),
    ProtonateCompoundsPlugin: defineAsyncComponent(() => import("@/Plugins/Optional/ProtonateCompounds/ProtonateCompoundsPlugin.vue")),
    PubChemBioassaysPlugin: defineAsyncComponent(() => import("@/Plugins/Optional/PubChem/PubChemBioassaysPlugin.vue")),
    PubChemFindSimilarPlugin: defineAsyncComponent(() => import("@/Plugins/Optional/PubChem/PubChemFindSimilarPlugin.vue")),
    PubChemNamesPlugin: defineAsyncComponent(() => import("@/Plugins/Optional/PubChem/PubChemNamesPlugin.vue")),
    PubChemPropsPlugin: defineAsyncComponent(() => import("@/Plugins/Optional/PubChem/PubChemPropsPlugin.vue")),
    ReducePlugin: defineAsyncComponent(() => import("@/Plugins/Optional/Reduce/ReducePlugin.vue")),
    SavePNGPlugin: defineAsyncComponent(() => import("@/Plugins/Optional/Graphics/SavePNGPlugin.vue")),
    SaveVRMLPlugin: defineAsyncComponent(() => import("@/Plugins/Optional/Graphics/SaveVRMLPlugin.vue")),
    WebinaPlugin: defineAsyncComponent(() => import("@/Plugins/Optional/Webina/WebinaPlugin.vue")),
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