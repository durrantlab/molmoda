<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" :actionBtnTxt="actionBtnTxt" :cancelBtnTxt="cancelBtnTxt"
        @onPopupDone="onPopupDone" @onUserArgChanged="onUserArgChanged" @onMolCountsChanged="onMolCountsChanged">
        <div v-if="archivedVersions.length > 0">
            <div v-for="version in archivedVersions" :key="version.version">

                <h6 class="mb-1"><a :href="version.url">{{ version.version }}</a></h6>

                <p class="ms-2 mb-0 alert alert-light lh-1 p-0 inverse-indent">
                    <!-- <small v-html="menuPathToUse(plugin.menuPath)"></small> -->
                    <small>
                        Date: {{ version.compileTimestamp }}
                    </small>
                </p>


                <p v-html="version.description" class="ms-2 mt-1"></p>

            </div>
        </div>
        <div v-else>
            <p>No archived versions available.</p>
        </div>
    </PluginComponent>

</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { appName } from "@/Core/GlobalVars";
import { Tag } from "./ActivityFocus/ActivityFocusUtils";
import versionsData from "@/../archive/index.json"; // Import the JSON data
import { TestCmdList } from "@/Testing/TestCmdList";

interface IArchivedVersion {
    version: string;
    compileTimestamp: string;
    description: string;
    url: string; // Added for convenience
}

/**
 * ArchivedVersionsPlugin component
 * Displays a list of archived application versions with links.
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class ArchivedVersionsPlugin extends PluginParentClass {
    menuPath = "Help/[8] Archived/[8] Archived Versions...";
    title = "Archived Versions";
    pluginId = "archivedversions";
    intro = `Access previous versions of ${appName}.`;
    details = "This plugin retains archived versions for reproducibility and provides the beta version for testing upcoming features.";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    tags = [Tag.All];
    userArgDefaults: UserArg[] = [];
    actionBtnTxt = ""; // No action button needed
    cancelBtnTxt = "Ok"; // Just close the informational popup

    archivedVersions: IArchivedVersion[] = [];

    /**
     * Prepare the version data before the popup opens.
     */
    async onBeforePopupOpen() {
        const baseArchiveUrl = "https://molmoda.org/archive/";
        const betaUrl = "https://beta.molmoda.org/";

        // Process the imported JSON data
        const processedVersions: IArchivedVersion[] = versionsData.map((v: any) => ({
            ...v,
            version: "Version " + v.version,
            url: `${baseArchiveUrl}${v.version}/`,
        }));

        // Add the beta version
        const betaVersion: IArchivedVersion = {
            version: "Beta Version",
            compileTimestamp: "Ongoing development",
            description: "Latest development build with newest features (likely contains bugs).",
            url: betaUrl,
        };

        // Combine and sort (optional, assuming JSON is sorted mostly)
        this.archivedVersions = [...processedVersions, betaVersion];

        // Optional: Sort by date descending (newest first) - careful with "Ongoing"
        // this.archivedVersions.sort((a, b) => {
        //     if (a.compileTimestamp === "Ongoing development") return -1; // Beta always first
        //     if (b.compileTimestamp === "Ongoing development") return 1;
        //     // Handle potential invalid dates if needed, treat them as older
        //     const dateA = new Date(a.compileTimestamp).getTime();
        //     const dateB = new Date(b.compileTimestamp).getTime();
        //     if (isNaN(dateA) && isNaN(dateB)) return 0;
        //     if (isNaN(dateA)) return 1; // Invalid date is older
        //     if (isNaN(dateB)) return -1; // Invalid date is older
        //     return dateB - dateA;
        // });
    }

    /**
     * No action needed when the popup is "done" (closed via Ok).
     */
    onPopupDone() {
        // No specific action needed when closing this informational popup.
        this.submitJobs([]); // Submit empty job list to close queue watcher if needed
    }

    /**
     * No background job needed for this plugin.
     * 
     * @returns {Promise<void>}
     */
    async runJobInBrowser(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Basic test to ensure the plugin opens and shows the beta version.
     * 
     * @returns {Promise<ITest>} Test commands.
     */
    async getTests(): Promise<ITest> {
        return {
            pluginOpen: () => new TestCmdList().waitUntilRegex(
                `#modal-${this.pluginId}`,
                "Beta Version" // Check if the beta version link text is present
            ),
            closePlugin: () => new TestCmdList().click(`#modal-${this.pluginId} .cancel-btn`),
            afterPluginCloses: () => new TestCmdList(),
        };
    }
}
</script>



<style scoped lang="scss">
.inverse-indent {
    text-indent: -1em;
    padding-left: 1em !important;
}
</style>