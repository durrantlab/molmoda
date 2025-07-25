<template>
  <div class="full-screen" style="display: flex; flex-direction: column">
    <TestData></TestData>
    <div id="menuContainer" style="
        z-index: 100;
        flex-grow: 0; /* Prevent growing */
        flex-shrink: 0; /* Prevent shrinking */
        max-height: 56px;
        min-height: 56px;
        height: 56px;
      " class="bg-light hide-on-app-closed">
      <Menu :menuData="menuData" />
    </div>
    <div style="flex-grow: 1; overflow: auto" class="hide-on-app-closed">
      <!-- GoldLayout needs to grow and handle overflow -->
      <GoldLayout />
    </div>
    <!-- Progress Bar: Pass active status and highest progress -->
    <ProgressBar :active="jobsAreRunningNow" :progress="highestProgress" style="flex-grow: 0; flex-shrink: 0" />
    <AllPlugins @onPluginSetup="onPluginSetup" :softwareCredits="softwareCredits"
      :contributorCredits="contributorCredits" :loadedPlugins="loadedPlugins" />
    <DragDropFileLoad />
    <ToastContainer />
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
import { appName } from "@/Core/GlobalVars";
import TestData from "@/Testing/TestData.vue";
import DragDropFileLoad from "@/UI/DragDropFileLoad.vue";
import SmilesPopupViewer from "@/UI/Components/SmilesPopupViewer.vue";
import { globalCredits } from "./GlobalCredits";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { loadedPlugins } from "@/Plugins/LoadedPlugins";
import { checkIfUrlOpen } from "@/FileSystem/UrlOpen";
import { setupAutoSave } from "@/Store/AutoSave";
import { setupElectron } from "@/Core/Electron/ElectronUtils";
import ProgressBar from "@/UI/Components/ProgressBar.vue"; // Import ProgressBar
import { getQueueStore } from "@/Queue/QueueStore"; // Import QueueStore access
import ToastContainer from "@/UI/MessageAlerts/Toasts/ToastContainer.vue";
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
    SmilesPopupViewer,
    ProgressBar,
    ToastContainer,
  },
})
export default class App extends Vue {
  // Menu data
  menuData: IMenuEntry[] = [];

  // Here so it will be reactive. See also LoadedPlugins.ts
  loadedPlugins: PluginParentClass[] = [];

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

  // --- Progress Bar Data (Simplified) ---
  jobsAreRunningNow = false;
  highestProgress = 0;
  progressBarInterval: number | null = null;
  // --------------------------------------

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
   * Called when a plugin has finished setting up. Collects the menu and
   * credits data. Runs each time a plugin is loaded, so multiple times (since
   * multiple plugins).
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

    this.loadedPlugins = Object.keys(loadedPlugins).map(
      (k) => loadedPlugins[k]
    );

    // Sort by title
    this.loadedPlugins.sort((a, b) => {
      const an = a.title.toLowerCase();
      const bn = b.title.toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
  }

  /** Polls the queue and updates the props passed to ProgressBar. */
  updateProgressBarProps() {
    const queueState = getQueueStore();
    const runningJobs = queueState.running;
    this.jobsAreRunningNow = runningJobs.length > 0;

    if (this.jobsAreRunningNow) {
      let currentHighest = 0;
      for (const job of runningJobs) {
        currentHighest = Math.max(currentHighest, job.progress);
      }
      this.highestProgress = currentHighest;
    } else {
      // If no jobs are running, the actual progress is 0. The ProgressBar
      // component handles the pause logic based on the active prop change.
      this.highestProgress = 0;
    }
  }

  /** mounted function */
  async mounted() {
    api.messages.log(`${appName} started`);

    if (
      compileErrors.length > 0 &&
      window.location.search.indexOf("test=") === -1
    ) {
      // There are compile errors
      let compileErrorsArray: string[] = [];
      for (let i = 0; i < compileErrors.length; i++) {
        compileErrorsArray.push(compileErrors[i]);
      }

      // Wait a second before showing the error for the plugin to be ready
      setTimeout(() => {
        api.messages.popupError(
          "<p>The following compile errors were found:</p><ul><li>" +
          compileErrorsArray.join("</li><li>") +
          "</li></ul>"
        );
      }, 1000); 
    }

    checkIfUrlOpen();
    setupAutoSave();
    setupElectron();

    // mainPubChemTest();

    // Start polling the queue store for progress updates
    this.progressBarInterval = window.setInterval(this.updateProgressBarProps, 250); // Check frequently
  }

  /** Clean up interval on unmount */
  beforeUnmount() {
    if (this.progressBarInterval) {
      clearInterval(this.progressBarInterval);
      this.progressBarInterval = null;
    }
  }
}
</script>

<style lang="scss">
// Global

@import "../assets/standard_bootstrap.scss";

// @import 'bootswatch/dist/cosmo/bootstrap.min.css';
// @import 'bootswatch/dist/sketchy/bootstrap.min.css';  // Love it (funny)
// @import 'bootswatch/dist/zephyr/bootstrap.min.css';  // Looks good

// Not such a fan...
// @import 'bootswatch/dist/materia/bootstrap.min.css';
// @import 'bootswatch/dist/minty/bootstrap.min.css';
// @import 'bootswatch/dist/united/bootstrap.min.css';
// @import "mdb-vue-ui-kit/css/mdb.min.css";

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  position: absolute;
  width: 100%;
  height: 100%;
}

.full-screen {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  /* Ensure flex layout */
  flex-direction: column;
  /* Stack children vertically */
}

body.waiting * {
  cursor: wait !important;
}

// See https://stackoverflow.com/questions/826782/how-to-disable-text-selection-highlighting

// Select not input not textarea
:not([textarea][input]) {
  -webkit-touch-callout: none;
  /* iOS Safari */
  -webkit-user-select: none;
  /* Safari */
  -khtml-user-select: none;
  /* Konqueror HTML */
  -moz-user-select: none;
  /* Old versions of Firefox */
  -ms-user-select: none;
  /* Internet Explorer/Edge */
  user-select: none;
  /* Non-prefixed version, currently supported by Chrome, Edge, Opera and
  Firefox */
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

.subtle-box {
  border: 1px solid rgb(223, 226, 230);
}

.lm_stack {
  overflow: hidden;
}

// Below necessary because should never use href equals "#"
a {
  cursor: pointer;
}

// Remove Tap Highlight Color: Mobile browsers often show a semi-transparent
// gray or blue highlight when a user taps on a link or clickable element. You
// can disable this for a cleaner look.
* {
  -webkit-tap-highlight-color: transparent;
}

// Improve Scrolling Feel: On iOS, you can enable momentum-based scrolling
// (where the content continues to scroll for a moment after you lift your
// finger), which feels much more native.
.tree-view-wrapper, .log-container { /* And any other scrollable containers */
  -webkit-overflow-scrolling: touch;
}
</style>
