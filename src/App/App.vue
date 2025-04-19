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
    <div style="flex-grow: 1; overflow: auto;" class="hide-on-app-closed">
      <!-- GoldLayout needs to grow and handle overflow -->
      <GoldLayout />
    </div>
    <!-- Progress Bar -->
    <ProgressBar :visible="progressBarVisible" :progress="progressBarProgress" :message="progressBarMessage"
      style="flex-grow: 0; flex-shrink: 0" />
    <AllPlugins @onPluginSetup="onPluginSetup" :softwareCredits="softwareCredits"
      :contributorCredits="contributorCredits" :loadedPlugins="loadedPlugins" />
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
import { appName } from "@/Core/GlobalVars";
import TestData from "@/Testing/TestData.vue";
import DragDropFileLoad from "@/UI/DragDropFileLoad.vue";
import Viewer2D from "@/UI/Components/Viewer2D.vue";
import { globalCredits } from "./GlobalCredits";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { loadedPlugins } from "@/Plugins/LoadedPlugins";
import { checkIfUrlOpen } from "@/FileSystem/UrlOpen";
import { setupAutoSave } from "@/Store/AutoSave";
import { setupElectron } from "@/Core/Electron/ElectronUtils";
import ProgressBar from "@/UI/Components/ProgressBar.vue"; // Import ProgressBar
import { getQueueStore } from "@/Queue/QueueStore"; // Import QueueStore access
import { IJobStatusInfo } from "@/Queue/QueueTypes"; // Import JobStatusInfo type

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// import "../assets/MDB5-STANDARD-UI-KIT-Free-6.4.0/js/mdb.min.js";

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const COMPLETION_PAUSE_MS = 250; // 0.25 seconds

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
    ProgressBar,
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

  // --- Progress Bar Data ---
  progressBarVisible = false;
  progressBarProgress = 0; // Current displayed progress (0-1)
  progressBarMessage = "";
  progressBarInterval: number | null = null;
  progressBarPauseActive = false; // Flag for the completion pause
  progressBarPauseTimeout: number | null = null; // Timeout ID for the completion pause
  progressBarInactivityTimeout: number | null = null; // Timeout ID for inactivity reset
  // -------------------------

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

  /** Clears the inactivity timeout. */
  private clearInactivityTimeout() {
    if (this.progressBarInactivityTimeout) {
      clearTimeout(this.progressBarInactivityTimeout);
      this.progressBarInactivityTimeout = null;
    }
  }

  /** Resets the inactivity timeout (clears existing, starts new). */
  private resetInactivityTimeout() {
    this.clearInactivityTimeout();
    this.progressBarInactivityTimeout = window.setTimeout(() => {
      console.warn("Progress bar timed out due to inactivity.");
      this.resetProgressBarState(); // Reset if inactive for too long
      this.progressBarInactivityTimeout = null;
    }, INACTIVITY_TIMEOUT_MS);
  }

  /** Resets the progress bar to its initial hidden state. */
  private resetProgressBarState() {
    this.progressBarVisible = false;
    this.progressBarProgress = 0;
    this.progressBarMessage = "";
    this.progressBarPauseActive = false;
    this.clearInactivityTimeout();
    this.cancelCompletionPause(); // Also cancel completion pause if resetting
  }


  /** Cancels any active completion pause. */
  private cancelCompletionPause() {
    if (this.progressBarPauseTimeout) {
      clearTimeout(this.progressBarPauseTimeout);
      this.progressBarPauseTimeout = null;
    }
    this.progressBarPauseActive = false; // Ensure flag is off
  }


  /** Updates the progress bar based on running jobs. */
  updateProgressBar() {
    // If a completion pause is active, wait for the timeout
    if (this.progressBarPauseActive) {
      return;
    }

    const queueState = getQueueStore();
    const runningJobs = queueState.running;
    const jobsAreRunningNow = runningJobs.length > 0;
    const wasVisible = this.progressBarVisible; // Track state from previous cycle

    if (jobsAreRunningNow) {
      // --- Jobs are currently running ---
      let currentHighestProgress = 0;
      for (const job of runningJobs) {
        currentHighestProgress = Math.max(currentHighestProgress, job.progress);
      }

      // Calculate the new progress, ensuring minimum 5% and never decreasing
      const newProgressCandidate = Math.max(0.05, currentHighestProgress);
      const newDisplayedProgress = Math.max(this.progressBarProgress, newProgressCandidate);

      // Update state only if changing
      if (this.progressBarProgress !== newDisplayedProgress || !this.progressBarVisible || this.progressBarMessage !== "Job running") {
        this.progressBarProgress = newDisplayedProgress;
        this.progressBarMessage = "Job running";
        this.progressBarVisible = true;
      }

      // Reset inactivity timer whenever there's activity
      this.resetInactivityTimeout();
      // Cancel any potentially lingering completion pause (e.g., if jobs restart quickly)
      this.cancelCompletionPause();

    } else {
      // --- No jobs are running now ---
      this.clearInactivityTimeout(); // Stop inactivity check

      if (wasVisible) {
        // Jobs *just* finished (bar was visible, now no jobs running)
        // Initiate the completion pause at 100%
        this.progressBarProgress = 1;
        this.progressBarMessage = "Finishing...";
        this.progressBarVisible = true; // Keep visible for the pause
        this.progressBarPauseActive = true;

        // Start the timeout to reset after the pause
        this.progressBarPauseTimeout = window.setTimeout(() => {
          this.resetProgressBarState(); // Reset fully after pause
        }, COMPLETION_PAUSE_MS);

      } else {
        // No jobs running, and the bar was already hidden. Ensure state is reset.
        if (this.progressBarProgress !== 0 || this.progressBarMessage !== "") {
          this.resetProgressBarState();
        }
      }
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

      api.messages.popupError(
        "<p>The following compile errors were found:</p><ul><li>" +
        compileErrorsArray.join("</li><li>") +
        "</li></ul>"
      );
    }

    checkIfUrlOpen();
    setupAutoSave();
    setupElectron();

    // mainPubChemTest();

    // Start polling the queue store for progress updates
    this.progressBarInterval = window.setInterval(this.updateProgressBar, 250); // Check frequently
  }

  /** Clean up interval on unmount */
  beforeUnmount() {
    if (this.progressBarInterval) {
      clearInterval(this.progressBarInterval);
      this.progressBarInterval = null;
    }
    this.clearInactivityTimeout(); // Clear inactivity timeout
    this.cancelCompletionPause(); // Clear completion pause timeout
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
  /* Non-prefixed version, currently
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
</style>
