<template>
    <PluginComponent
        :infoPayload="infoPayload"
        v-model="open"
        cancelBtnTxt="Deny"
        actionBtnTxt="Allow"
        actionBtnTxt2="Allow All"
        @onDone="onAllow"
        @onDone2="onAllowAll"
        @onCancel="onDeny"
        @onClosed="onClosed"
        variant="warning"
        @onUserArgChanged="onUserArgChanged"
        @onPopupDone="onPopupDone"
        @onMolCountsChanged="onMolCountsChanged"
    >
        <p>{{ myAppName }} would like to access a third-party web resource:</p>
        <p>{{ url }}</p>
        <p>
            To protect your data, {{ myAppName }} will not communicate with this
            resource without your permission. You may "Deny" this request,
            "Allow" this request, or "Allow All" requests to any third-party
            resource, both now and in the future (see also Settings...).
            <!-- <PluginPathLink plugin="settings"></PluginPathLink>) -->
        </p>

        <!-- modalWidth="default" -->
        <!-- <MessageList :messages="simpleMsgs"></MessageList> -->
    </PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options } from "vue-class-component";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest, _TestClick, _TestWait } from "@/Testing/TestCmd";
import { pluginsApi } from "@/Api/Plugins";
import { messagesApi } from "@/Api/Messages";
import MessageList from "@/UI/MessageAlerts/MessageList.vue";
import { appName } from "@/Core/GlobalVars";
import { Tag } from "../Tags/Tags";
// import PluginPathLink from "@/UI/Navigation/PluginPathLink.vue";

/**
 * FetcherPermissionPlugin
 */
@Options({
    components: {
        Popup,
        PluginComponent,
        MessageList,
        // PluginPathLink
    },
})
export default class FetcherPermissionPlugin extends PluginParentClass {
    menuPath = null;
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "fetcherpermission";
    intro = "";
    tags = [Tag.All];

    myAppName = appName;
    url = "";
    onDeny = () => {
        return;
    };
    onAllow = () => {
        return;
    };
    onAllowAll = () => {
        return;
    };

    // Below set via onPluginStart.
    // simpleMsgs: ISimpleMsg[] = [];

    title = "Access Third-Party Web Resource";
    showInQueue = false;

    userArgDefaults: UserArg[] = [];
    
    logJob = false;

    /**
     * Runs when the user first starts the plugin. For example, if the plugin is
     * in a popup, this function would open the popup.
     *
     * @param {any} [payload]  Information about the message to display.
     * @returns {Promise<void>}       Promise that resolves when the plugin is
     *                                finished starting.
     */
    async onPluginStart(payload: any): Promise<void> {
        this.url = payload.url;
        this.onDeny = payload.onDeny;
        this.onAllow = payload.onAllow;
        this.onAllowAll = () => {
            // For secondary button, doesn't close automatically.
            this.closePopup();

            payload.onAllowAll();
        };

        messagesApi.stopAllWaitSpinners();

        this.open = true;
    }

    /**
     * Runs when the user closes the simple message popup.
     */
    onClosed() {
        this.submitJobs();
    }

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        // Not going to test closing, etc. (Too much work.) But at least opens
        // to see if an error occurs.

        // No way to specify url, etc., via standdard test system. So doing it
        // manually.
        pluginsApi.runPlugin(this.pluginId, {
            url: "https://files.rcsb.org/view/1XDN.pdb",
            onDeny: this.onDeny,
            onAllow: this.onAllow,
            onAllowAll: this.onAllowAll,
        });
        setTimeout(() => {
            pluginsApi.runPlugin(this.pluginId, {
                url: "https://files.rcsb.org/view/1XDN.pdb",
                onDeny: this.onDeny,
                onAllow: this.onAllow,
                onAllowAll: this.onAllowAll,
            });
        }, 5000);

        new _TestClick("#modal-fetcherpermission .action-btn").addToCmdList();
        new _TestWait(5).addToCmdList();
        new _TestClick("#modal-fetcherpermission .action-btn2").addToCmdList();

        return [];
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
