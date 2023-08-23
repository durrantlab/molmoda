<!-- NOTE: Do not remove comments "TEMPLATE# START" and "TEMPLATE# END". Build
system uses these to autopopulate with plugins. -->
<template>
  <div>
    <AboutPlugin
      @onPluginSetup="onPluginSetup"
      :softwareCreditsToShow="softwareCredits"
      :contributorCreditsToShow="contributorCredits"
    />
    <HelpPlugin @onPluginSetup="onPluginSetup" :loadedPlugins="loadedPlugins" />

    <!-- TEMPLATE1 START -->
    <ClearSelectionPlugin @onPluginSetup="onPluginSetup"></ClearSelectionPlugin>
    <CloneMolPlugin @onPluginSetup="onPluginSetup"></CloneMolPlugin>
    <DataWindowPlugin @onPluginSetup="onPluginSetup"></DataWindowPlugin>
    <DeleteMolPlugin @onPluginSetup="onPluginSetup"></DeleteMolPlugin>
    <InformationWindowPlugin
      @onPluginSetup="onPluginSetup"
    ></InformationWindowPlugin>
    <JobsWindowPlugin @onPluginSetup="onPluginSetup"></JobsWindowPlugin>
    <LoadAlphaFoldPlugin @onPluginSetup="onPluginSetup"></LoadAlphaFoldPlugin>
    <LoadPDBPlugin @onPluginSetup="onPluginSetup"></LoadPDBPlugin>
    <LoadPubChemPlugin @onPluginSetup="onPluginSetup"></LoadPubChemPlugin>
    <LogWindowPlugin @onPluginSetup="onPluginSetup"></LogWindowPlugin>
    <MergeMolsPlugin @onPluginSetup="onPluginSetup"></MergeMolsPlugin>
    <MoveRegionsOnClickPlugin
      @onPluginSetup="onPluginSetup"
    ></MoveRegionsOnClickPlugin>
    <NavigatorWindowPlugin
      @onPluginSetup="onPluginSetup"
    ></NavigatorWindowPlugin>
    <NewProjectPlugin @onPluginSetup="onPluginSetup"></NewProjectPlugin>
    <OpenMoleculesPlugin @onPluginSetup="onPluginSetup"></OpenMoleculesPlugin>
    <RedoPlugin @onPluginSetup="onPluginSetup"></RedoPlugin>
    <RenameMolPlugin @onPluginSetup="onPluginSetup"></RenameMolPlugin>
    <SaveMoleculesPlugin @onPluginSetup="onPluginSetup"></SaveMoleculesPlugin>
    <SavePNGPlugin @onPluginSetup="onPluginSetup"></SavePNGPlugin>
    <SaveVRMLPlugin @onPluginSetup="onPluginSetup"></SaveVRMLPlugin>
    <SelectAllPlugin @onPluginSetup="onPluginSetup"></SelectAllPlugin>
    <SettingsPlugin @onPluginSetup="onPluginSetup"></SettingsPlugin>
    <SimpleMsgPlugin @onPluginSetup="onPluginSetup"></SimpleMsgPlugin>
    <StylesWindowPlugin @onPluginSetup="onPluginSetup"></StylesWindowPlugin>
    <UndoPlugin @onPluginSetup="onPluginSetup"></UndoPlugin>
    <ViewerWindowPlugin @onPluginSetup="onPluginSetup"></ViewerWindowPlugin>

    <AddRegionPlugin @onPluginSetup="onPluginSetup"></AddRegionPlugin>
    <FPocketWebPlugin @onPluginSetup="onPluginSetup"></FPocketWebPlugin>
    <MolPropsPlugin @onPluginSetup="onPluginSetup"></MolPropsPlugin>
    <PasteFilePlugin @onPluginSetup="onPluginSetup"></PasteFilePlugin>
    <!--DrawMoleculePlugin @onPluginSetup="onPluginSetup"></DrawMoleculePlugin-->
    <ProtonateCompoundsPlugin
      @onPluginSetup="onPluginSetup"
    ></ProtonateCompoundsPlugin>
    <QueSystemTestPlugin @onPluginSetup="onPluginSetup"></QueSystemTestPlugin>
    <ReducePlugin @onPluginSetup="onPluginSetup"></ReducePlugin>
    <StatCollectionPlugin @onPluginSetup="onPluginSetup"></StatCollectionPlugin>
    <TestPlugin @onPluginSetup="onPluginSetup"></TestPlugin>
    <WebinaPlugin @onPluginSetup="onPluginSetup"></WebinaPlugin>
    <!-- TEMPLATE1 END -->
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import {
  IContributorCredit,
  IPluginSetupInfo,
  ISoftwareCredit,
} from "./PluginInterfaces";
import { PluginParentClass } from "./Parents/PluginParentClass/PluginParentClass";

import AboutPlugin from "@/Plugins/Core/AboutPlugin.vue";
import HelpPlugin from "@/Plugins/Core/HelpPlugin.vue";

// TEMPLATE2 START
import ClearSelectionPlugin from "./Core/EditBar/ClearSelectionPlugin.vue";
import CloneMolPlugin from "./Core/EditBar/CloneMolPlugin.vue";
import DataWindowPlugin from "./Core/Window/DataWindowPlugin.vue";
import DeleteMolPlugin from "./Core/EditBar/DeleteMolPlugin.vue";
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
import RedoPlugin from "./Core/UndoRedo/RedoPlugin.vue";
import RenameMolPlugin from "./Core/EditBar/RenameMolPlugin.vue";
import SaveMoleculesPlugin from "./Core/LocalMolLoadersSavers/SaveMoleculesPlugin.vue";
import SavePNGPlugin from "./Core/Graphics/SavePNGPlugin.vue";
import SaveVRMLPlugin from "./Core/Graphics/SaveVRMLPlugin.vue";
import SelectAllPlugin from "./Core/SelectAllPlugin.vue";
import SettingsPlugin from "./Core/Settings/SettingsPlugin.vue";
import SimpleMsgPlugin from "./Core/SimpleMsgPlugin.vue";
import StylesWindowPlugin from "./Core/Window/StylesWindowPlugin.vue";
import UndoPlugin from "./Core/UndoRedo/UndoPlugin.vue";
import ViewerWindowPlugin from "./Core/Window/ViewerWindowPlugin.vue";

import AddRegionPlugin from "./Optional/AddRegionPlugin.vue";
import FPocketWebPlugin from "./Optional/FPocketWeb/FPocketWebPlugin.vue";
import MolPropsPlugin from "./Optional/MolProps/MolPropsPlugin.vue";
import PasteFilePlugin from "./Optional/PasteFilePlugin.vue";
// import DrawMoleculePlugin from "./Optional/DrawMoleculePlugin.vue";
import ProtonateCompoundsPlugin from "./Optional/ProtonateCompounds/ProtonateCompoundsPlugin.vue";
import QueSystemTestPlugin from "./Optional/QueSystemTestPlugin.vue";
import ReducePlugin from "./Optional/Reduce/ReducePlugin.vue";
import StatCollectionPlugin from "./Optional/StatCollectionPlugin.vue";
import TestPlugin from "./Optional/TestPlugin.vue";
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
    DataWindowPlugin,
    DeleteMolPlugin,
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
    RedoPlugin,
    RenameMolPlugin,
    SaveMoleculesPlugin,
    SavePNGPlugin,
    SaveVRMLPlugin,
    SelectAllPlugin,
    SettingsPlugin,
    SimpleMsgPlugin,
    StylesWindowPlugin,
    UndoPlugin,
    ViewerWindowPlugin,

    AddRegionPlugin,
    FPocketWebPlugin,
    MolPropsPlugin,
    // DrawMoleculePlugin,
    PasteFilePlugin,
    ProtonateCompoundsPlugin,
    QueSystemTestPlugin,
    ReducePlugin,
    StatCollectionPlugin,
    TestPlugin,
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

<style scoped lang="scss"></style>
