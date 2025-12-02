<template>
    <PluginComponent :infoPayload="infoPayload" v-model="open" @onPopupDone="onPopupDone" @onPopupCancel="onPopupCancel"
  @onUserArgChanged="onUserArgChanged" actionBtnTxt="Enable & Support" cancelBtnTxt="No, Thanks"
        @onMolCountsChanged="onMolCountsChanged">
        <div>
   <p class="lead text-center mb-3">
    Help keep {{ appName }} free and open-source.
            </p>
   <p>
    {{ appName }} relies on grant funding to continue development. To secure these grants,
    we need to demonstrate to funding agencies that the software is being used.
            </p>

   <div class="card bg-light mb-3">
    <div class="card-body p-2">
     <h6 class="card-title mb-2">Our Privacy Guarantee:</h6>
     <div class="d-flex align-items-center mb-1">
      <span class="text-success me-2">✔</span>
      <small>We <strong>DO</strong> count anonymous page visits and geography.</small>
     </div>
     <div class="d-flex align-items-center mb-1">
      <span class="text-success me-2">✔</span>
      <small>We <strong>DO</strong> save your layout and preferences locally.</small>
     </div>
     <div class="d-flex align-items-center">
      <span class="text-danger me-2" style="font-weight:bold">✕</span>
      <small>We <strong>NEVER</strong> track your molecules, sequences, or results.</small>
     </div>
    </div>
   </div>

   <div class="alert alert-light border p-2 mb-0" style="font-size: 0.8rem; line-height: 1.3; color: #6c757d;">
   <p class="mb-1">
     We use <strong>Google Analytics</strong> to collect these anonymous statistics.
    </p>
    <p class="mb-1">
     By clicking "Enable & Support", you consent to your anonymous usage data being transmitted to and stored by Google in the <strong>United States</strong>, where it is subject to <strong>U.S. law</strong>.
    </p>
    <p class="mb-0">
     {{ appName }} works without cookies enabled. You can revoke this permission at any time via
     <PluginPathLink plugin="settings"></PluginPathLink>.
   </p>
        </div>
  </div>
    </PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "../../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../../Parents/PluginParentClass/PluginParentClass";
import { Options } from "vue-class-component";
import { isStatStatusSet, disableStats, enableStats } from "./StatUtils";
import {
    ISoftwareCredit,
    IContributorCredit,
} from "@/Plugins/PluginInterfaces";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { isTest } from "@/Core/GlobalVars";
import { appName } from "@/Core/GlobalVars";
import * as api from "@/Api";
import PluginPathLink from "@/UI/Navigation/PluginPathLink.vue";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";

/**
 * StatCollectionPlugin
 *
 * Approaches to improve authorization:
 * 1. Grant Funding Narrative: Link permission to the survival of the tool.
 * 2. Privacy Assurance: Explicitly list what is NOT tracked (molecules/IP).
 * 3. Functional Benefit: Emphasize saving settings/preferences.
 * 4. Visual Distinction: Use Check/X marks to make the privacy policy scannable.
 * 5. Button Phrasing: "Enable & Support" implies a positive contribution rather than just compliance.
 * 6. Legal Transparency: Explicitly mentions Google Analytics, US storage, and US law.
 */
@Options({
    components: {
        PluginComponent,
        PluginPathLink
    },
})
export default class StatCollectionPlugin extends PluginParentClass {
    // menuPath = "Test/StatCollection...";
    menuPath = null;
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    //     {
    //         name: "Yuri K. Kochnev",
    //         // url: "durrantlab.com",
    //     },
    // ];
    pluginId = "statcollection";
 intro = "Support future development.";
 details = "This plugin enables anonymous statistics to help us secure funding to keep MolModa free.";
 title = `Support ${appName}?`;
    open = false;
    tags = [Tag.All];
    userArgDefaults: UserArg[] = [];

    /**
     * The name of the application.
     *
     * @returns {string} The name of the application.
     */
    get appName(): string {
        return appName;
    }

    /**
     * Runs when the user presses the cancel button and the popup closes.
     */
    onPopupCancel() {
        // Check back in a few days
        disableStats();
    }

    /**
     * Runs when the user presses the action button and the popup closes. Does
     * not run with cancel button.
     */
    onPopupDone() {
        enableStats();
    }

    /**
     * Each plugin is associated with specific jobs (calculations). Most of
     * these will run in the browser itself, rather than on a remote computing
     * resource. This function runs a single job in the browser (or calls the
     * JavaScript/WASM libraries to run the job). The job-queue system calls
     * `runJob` directly.
     *
     * @param {any} args  One of the parameterSets items submitted via the
     *                    `submitJobs` function. Optional.
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     *     Return void if there's nothing to return.
     */
    runJobInBrowser(args: any): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @returns {ITest[]}  The selenium test command(s).
     */
    async getTests(): Promise<ITest[]> {
        // Not going to test closing, etc. (Too much work.) But at least opens
        // to see if an error occurs.

        api.plugins.runPlugin(this.pluginId, {});

        return [];
    }

    /**
     * Runs when the plugin is first loaded.
     */
    async onMounted() {
        // Putting this in a timeout to avoid a testing error. Sometimes the
        // javascript hasn't completely loaded yet. Hacky, admittedly.
        setTimeout(async () => {
            const statStatusSet = await isStatStatusSet();
            this.open = !isTest && !statStatusSet;
        }, 1000);

    }
}
</script>

<style scoped>
.lead {
 font-size: 1.1rem;
 font-weight: 500;
}
</style>