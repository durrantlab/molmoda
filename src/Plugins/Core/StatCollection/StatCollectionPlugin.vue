<template>
    <PluginComponent
        :infoPayload="infoPayload"
        v-model="open"
        @onPopupDone="onPopupDone"
        @onPopupCancel="onPopupCancel"
        @onUserArgChanged="onUserArgChanged"
        :actionBtnTxt="'Yes, Support ' + appName"
        cancelBtnTxt="No, Opt Out"
    >
        <div>
            <p>Dear user,</p>
            <p>
                We need your help! Would you please authorize us to use Google
                Analytics 4 (GA4) to record limited information about your use
                of {{appName}}?
            </p>

            <p>
                <b>
                    Help us convince funding agencies that our work makes a
                    difference.
                </b>
                The
                <a href="http://durrantlab.com" target="_blank">Durrant lab</a>
                is a not-for-profit team dedicated to making open-source
                software more accessible. Tracking usage helps us convince
                funding agencies to provide the essential grants our work relies
                on. It also helps us understand how we can improve our software.
            </p>

            <p>
                <b>What information?</b> We'll never use GA4 to record your
                molecular structures or analyses. GA4 only gathers basic user
                data like tracking IDs, IP addresses, and device details. This
                data is sent to Google in the U.S. for processing and so is
                subject to U.S. law.
            </p>

            <p>
                <b>No strings attached.</b> {{appName}} is fully accessible without
                GA4 enabled, but we hope you'll choose to help us out! You can
                disable GA4 anytime through <i>{{appName}} → Settings...</i>
            </p>

            <p>Is it alright if we enable GA4?</p>
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
import { ITest } from "@/Testing/TestCmd";
import { isTest } from "@/Testing/SetupTests";
import { appName } from "@/Core/GlobalVars";
import * as api from "@/Api";

/**
 * StatCollectionPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class StatCollectionPlugin extends PluginParentClass {
    // menuPath = "Test/StatCollection...";
    menuPath = null;
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Yuri K. Kochnev",
            url: "durrantlab.com",
        },
    ];
    pluginId = "statcollection";
    intro = "";
    title = `Support ${appName} Development!`;
    open = false;

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
    getTests(): ITest[] {
        // Not going to test closing, etc. (Too much work.) But at least opens
        // to see if an error occurs.

        api.plugins.runPlugin(this.pluginId, {});

        return [];
    }

    /**
     * Runs when the plugin is first loaded.
     */
    async onMounted() {
        const statStatusSet = await isStatStatusSet();
        this.open = !isTest && !statStatusSet;
    }
}
</script>

<style scoped></style>
