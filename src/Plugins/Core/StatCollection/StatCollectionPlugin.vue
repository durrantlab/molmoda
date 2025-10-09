<template>
    <PluginComponent :infoPayload="infoPayload" v-model="open" @onPopupDone="onPopupDone" @onPopupCancel="onPopupCancel"
        @onUserArgChanged="onUserArgChanged" actionBtnTxt="Allow" cancelBtnTxt="Decline"
        @onMolCountsChanged="onMolCountsChanged">
        <div>
            <p>
                We use cookies to store user settings and collect usage
                statistics via Google Analytics (GA). Tracking usage helps us
                convince funding agencies to provide the essential grants our
                work relies on.
            </p>

            <p>
                We'll never use GA to record your molecular structures or
                analyses. GA only gathers basic user data like tracking IDs, IP
                addresses, and device details. This data is sent to Google in
                the U.S. for processing and so is subject to U.S. law.
            </p>

            <p>
                {{ appName }} is accessible without cookies enabled. If you
                enable cookies, you can disable them anytime through
                <PluginPathLink plugin="settings"></PluginPathLink>
            </p>

            <!-- <p>Dear user,</p>
            <p>
                We need your help! Would you please authorize us to use Google
                Analytics 4 (GA) to record limited information about your use of
                {{appName}}?
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
                <b>What information?</b> We'll never use GA to record your
                molecular structures or analyses. GA only gathers basic user
                data like tracking IDs, IP addresses, and device details. This
                data is sent to Google in the U.S. for processing and so is
                subject to U.S. law.
            </p>

            <p>
                <b>No strings attached.</b> {{appName}} is fully accessible
                without GA enabled, but we hope you'll choose to help us out!
                You can disable GA anytime through <i>{{appName}} →
                Settings...</i>
            </p>

            <p>Is it alright if we enable GA?</p> -->
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
    intro = "Manage cookie and usage statistics settings.";
    title = `Allow Cookies?`;
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
        const statStatusSet = await isStatStatusSet();
        this.open = !isTest && !statStatusSet;
    }
}
</script>

<style scoped></style>
