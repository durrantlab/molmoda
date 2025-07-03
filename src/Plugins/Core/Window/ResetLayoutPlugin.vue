<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload"></PluginComponent>
</template>
<script lang="ts">
import { Options } from "vue-class-component";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { IContributorCredit, ISoftwareCredit } from "@/Plugins/PluginInterfaces";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { localStorageRemoveItem } from "@/Core/LocalStorage";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { layoutApi } from "@/Api/Layout";
/**
 * A plugin to reset the layout to its default configuration.
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class ResetLayoutPlugin extends PluginParentClass {
    menuPath = ["Window", "[9] Reset Layout"];
    title = "Reset Layout";
    pluginId = "resetlayout";
    intro = "Resets the panel layout to its default configuration.";
    noPopup = true;
    logJob = false;
    logAnalytics = false;

    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    userArgDefaults: UserArg[] = [];
    tags = [Tag.All];

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @returns {Promise<void>}  Resolves when the job is done.
     */
    async runJobInBrowser(): Promise<void> {
        await localStorageRemoveItem("goldenLayoutState");
        layoutApi.reset();
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest}  The selenium test commands.
     */
    async getTests(): Promise<ITest> {
        // Test is simple: just run the plugin. If any JS errors occur, the
        // test will fail automatically. The default test behavior includes
        // a wait at the end to allow for observation of any errors.
        return {};
    }
}
</script>