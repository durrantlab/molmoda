<template>
  <div class="full-screen" style="display: flex; flex-direction: column">
    <TestData></TestData>
    <div
      style="
        z-index: 1;
        flex-grow: 5;
        max-height: 56px;
        min-height: 56px;
        height: 56px;
      "
      class="bg-light"
    >
      <Menu :menuData="menuData" />
    </div>
    <div style="flex-grow: 5">
      <GoldLayout />
    </div>
    <AllPlugins
      @onPluginSetup="onPluginSetup"
      :softwareCredits="softwareCredits"
      :contributorCredits="contributorCredits"
    />
    <DragDropFileLoad />
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import GoldLayout from "@/UI/Layout/GoldenLayout/GoldLayout.vue";
import Menu from "@/UI/Navigation/Menu/Menu.vue";
import AllPlugins from "../Plugins/AllPlugins.vue";
import { addMenuItem, IMenuEntry } from "../UI/Navigation/Menu/Menu";
import {
  Credits,
  IContributorCredit,
  IPluginSetupInfo,
  ISoftwareCredit,
} from "../Plugins/PluginInterfaces";
import { dynamicImports } from "@/Core/DynamicImports";
import * as api from "@/Api";
import * as compileErrors from "../compile_errors.json";
import { appName } from "@/Core/AppName";
import TestData from "@/Testing/TestData.vue";
import DragDropFileLoad from "@/UI/DragDropFileLoad.vue";
import Viewer2D from "@/UI/Components/Viewer2D.vue";
import JobManager from "@/Queue/JobManagers/JobManager.vue";
import { globalCredits } from "./GlobalCredits";

/**
 * Main app component
 */
@Options({
  components: {
    GoldLayout,
    Menu,
    AllPlugins,
    TestData,
    DragDropFileLoad,
    Viewer2D,
    JobManager,
  },
})
export default class App extends Vue {
  // Menu data
  menuData: IMenuEntry[] = [];

  // Software credits (libraries used)
  softwareCredits: ISoftwareCredit[] = globalCredits;

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
    api.messages.log(`${appName} suite started`);

    if (compileErrors.length > 0) {
      // There are compile errors
      api.messages.popupError(
        "<p>The following compile errors were found:</p><ul><li>" +
          compileErrors.join("</li><li>") +
          "</li></ul>"
      );
    }
  }
}
</script>

<style lang="scss">
// Global

// @import "bootstrap/dist/css/bootstrap.min.css";
// @import "bootstrap/scss/bootstrap.scss";
// @import "bootstrap/scss/bootstrap";

// See https://getbootstrap.com/docs/5.0/customize/optimize/

// Configuration
@import "bootstrap/scss/functions";
@import "bootstrap/scss/variables";
@import "bootstrap/scss/mixins";
@import "bootstrap/scss/utilities";

// Layout & components
@import "bootstrap/scss/root";
@import "bootstrap/scss/reboot";
@import "bootstrap/scss/containers";
@import "bootstrap/scss/grid";
@import "bootstrap/scss/tables";
@import "bootstrap/scss/forms";
@import "bootstrap/scss/buttons";
@import "bootstrap/scss/dropdown";
@import "bootstrap/scss/nav";
@import "bootstrap/scss/navbar";
@import "bootstrap/scss/alert";
@import "bootstrap/scss/modal";
@import "bootstrap/scss/tooltip";

@import "bootstrap/scss/accordion";
@import "bootstrap/scss/transitions";  // Needed for accordion
@import "bootstrap/scss/close";

// @import "bootstrap/scss/type";  // What for?
// @import "bootstrap/scss/pagination";
// @import "bootstrap/scss/card";
// @import "bootstrap/scss/button-group";
// @import "bootstrap/scss/badge";
// @import "bootstrap/scss/progress";
// @import "bootstrap/scss/list-group";
// @import "bootstrap/scss/popover";

// @import "bootstrap/scss/images";
// @import "bootstrap/scss/breadcrumb";
// @import "bootstrap/scss/toasts";
// @import "bootstrap/scss/carousel";
// @import "bootstrap/scss/spinners";
// @import "bootstrap/scss/offcanvas";

// Helpers
@import "bootstrap/scss/helpers";

// Utilities
@import "bootstrap/scss/utilities/api";

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

// See https://stackoverflow.com/questions/826782/how-to-disable-text-selection-highlighting

// Select not input not textarea
:not([textarea][input]) {
  -webkit-touch-callout: none; /* iOS Safari */
    -webkit-user-select: none; /* Safari */
     -khtml-user-select: none; /* Konqueror HTML */
       -moz-user-select: none; /* Old versions of Firefox */
        -ms-user-select: none; /* Internet Explorer/Edge */
            user-select: none; /* Non-prefixed version, currently
                                  supported by Chrome, Edge, Opera and Firefox */
}

// https://stackoverflow.com/questions/7855590/preventing-scroll-bars-from-being-hidden-for-macos-trackpad-users-in-webkit-blin

// ::-webkit-scrollbar-x {
//     -webkit-appearance: none;
//     width: 0; /* Remove vertical space */
//     height: 8px;
// }
// ::-webkit-scrollbar-thumb {
//     border-radius: 4px;
//     background-color: rgba(0,0,0,.5);
//     box-shadow: 0 0 1px rgba(255,255,255,.5);
// }
</style>
