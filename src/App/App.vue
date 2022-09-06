<template>
  <div class="full-screen" style="display: flex; flex-direction: column">
    <div style="flex-grow: 5; max-height: 56px; min-height: 56px; height: 56px;">
      <Menu :menuData="menuData" />
    </div>
    <div style="flex-grow: 5">
      <!-- <div style="width: 100%; height: 100%; padding: 15px;"></div> -->
      <GoldLayout />
    </div>
    <AllPlugins
      @onPluginSetup="onPluginSetup"
      :softwareCredits="softwareCredits"
      :contributorCredits="contributorCredits"
    />
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import GoldLayout from "@/UI/Layout/GoldenLayout/GoldLayout.vue";
import Menu from "@/UI/Navigation/Menu/Menu.vue";
import AllPlugins from "../Plugins/AllPlugins.vue";
import {
  addMenuItem,
  IMenuEntry,
} from "../UI/Navigation/Menu/Menu";
import {
  Credits,
  IContributorCredit,
  ISoftwareCredit,
} from "../Plugins/PluginInterfaces";
import { globalCredits as globalSoftwareCredits } from "./GlobalCredits";
import { IPluginSetupInfo } from "@/Plugins/PluginParent";
import { dynamicImports } from "@/Core/DynamicImports";


/**
 * Main app component
 */
@Options({
  components: {
    GoldLayout,
    Menu,
    AllPlugins,
  },
})
export default class App extends Vue {
  // Menu data
  menuData: IMenuEntry[] = [];

  // Software credits (libraries used)
  softwareCredits: ISoftwareCredit[] = globalSoftwareCredits;

  // Contributor credits (people)
  contributorCredits: IContributorCredit[] = [
    {
      name: "Center for Research Computing (University of Pittsburgh)",
      url: "https://crc.pitt.edu/",
    },
  ];

  // Triggers error modal with this message.
  errorMsg = "";

  /**
   * Removes credits with duplicate names.
   *
   * @param {Credits} credits  Credits to consider.
   * @returns {Credits} The list of credits, with ones that have duplicate names
   *     removed.
   */   
  private _removeDuplicateNames(credits: Credits): Credits {
    return credits.filter(
      (v: any, i: any, a: any) =>
        a.findIndex((x: any) => x.name === v.name) === i
    );
  }

  /**
   * Called when a plugin has finished setting up. Collects the menu and credits
   * data.
   * 
   * @param {IPluginSetupInfo} pluginSetupInfo  Information about the plugin
   *                                            that has finished setting up.
   */
  onPluginSetup(pluginSetupInfo: IPluginSetupInfo) {
    this.menuData = addMenuItem(
      pluginSetupInfo.menuData,
      this.menuData,
      pluginSetupInfo.pluginId
    );
    this.softwareCredits = [
      ...this.softwareCredits,
      ...pluginSetupInfo.softwareCredits,
      ...Object.values(dynamicImports).map((v) => v.credit),
    ];

    // Remove items from credits if they have the same name
    this.softwareCredits = this._removeDuplicateNames(
      this.softwareCredits
    ) as ISoftwareCredit[];

    this.contributorCredits = [
      ...this.contributorCredits,
      ...pluginSetupInfo.contributorCredits,
    ];

    // Remove items from contributorCredits if they have the same name
    this.contributorCredits = this._removeDuplicateNames(
      this.contributorCredits
    );
  }

  /** mounted function */
  mounted() {
    // Close enough to rendered, I think.
    // api.sys.loadStatus.vueRendered = true;
  }
}
</script>

<style lang="scss">
// Global

@import "bootstrap/dist/css/bootstrap.min.css";
// @import "bootstrap/scss/bootstrap.scss";
// @import "bootstrap/scss/bootstrap";

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  /* Takes up whole screen */
  position: absolute;
  width: 100%;
  height: 100%;
}

.full-screen {
  /* Takes up whole screen */
  position: absolute;
  width: 100%;
  height: 100%;
}

body.waiting * {
  cursor: wait !important;
}
</style>
