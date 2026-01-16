<template>
    <PluginComponent :infoPayload="infoPayload" v-model="open" @onPopupDone="onPopupDone" @onPopupCancel="onPopupCancel"
        @onUserArgChanged="onUserArgChanged" actionBtnTxt="Enable & Support" cancelBtnTxt="No, Thanks"
        cancelBtnClass="btn-link text-decoration-none text-secondary" :cancelXBtn="false"
        @onMolCountsChanged="onMolCountsChanged">
        <div>
            <!-- <p class="fs-5 fw-medium text-center mb-3">
                Help keep {{ appName }} free and open-source.
            </p> -->
            <p>
                {{ appName }} depends on grant funding. To secure these grants,
                we need to show funding agencies that the software is actively used.
            </p>

            <div class="card bg-light mb-3">
                <div class="card-body p-2">
                    <h6 class="card-title mb-2">Our Privacy Guarantee:</h6>
                    <div class="d-flex align-items-center mb-1">
                        <span class="text-success me-2">✔</span>
                        <small>We <strong>DO</strong> collect basic usage statistics.</small>
                    </div>
                    <div class="d-flex align-items-center mb-1">
                        <span class="text-success me-2">✔</span>
                        <small>We <strong>DO</strong> save your layout and preferences locally via cookies.</small>
                    </div>
                    <div class="d-flex align-items-center">
                        <span class="text-danger me-2 fw-bold">✕</span>
                        <small>We <strong>NEVER</strong> collect your molecules, sequences, or results.</small>
                    </div>
                </div>
            </div>

            <p class="mt-3 mb-0" style="font-size: 0.75rem; line-height: 1.3; color: #999;">
                If you click "Enable & Support", basic usage data will be sent to Google in the United States,
                subject to U.S.
                law.
                {{ appName }} works without cookies. You can revoke consent anytime via
                <PluginPathLink plugin="settings" linkClass="text-reset text-decoration-underline"></PluginPathLink>.
            </p>
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
    intro = null; // "Support future development.";
    details = null; // "Anonymous usage statistics help us secure funding to keep MolModa free.";
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