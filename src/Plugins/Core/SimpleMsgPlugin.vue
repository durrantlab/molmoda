<template>
    <PluginComponent
        :infoPayload="infoPayload"
        v-model="open"
        :cancelBtnTxt="neverClose ? '' : 'Ok'"
        actionBtnTxt=""
        @onClosed="onClosed"
        :variant="variantToUse"
        @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"
    >
        <!-- modalWidth="default" -->
    <MessageList :messages="simpleMsgs"></MessageList>
    </PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options } from "vue-class-component";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import {
    ISimpleMsg,
    PopupVariant,
} from "@/UI/Layout/Popups/InterfacesAndEnums";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { pluginsApi } from "@/Api/Plugins";
import MessageList from "@/UI/MessageAlerts/MessageList.vue";
import { Tag } from "../Tags/Tags";

/**
 * SimpleMsgPlugin
 */
@Options({
    components: {
        Popup,
        PluginComponent,
        MessageList
    },
})
export default class SimpleMsgPlugin extends PluginParentClass {
    // @Prop({ required: true }) title!: string;
    // @Prop({ required: true }) message!: string;

    menuPath = null;
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //   name: "Jacob D. Durrant",
        //   url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "simplemsg";
    intro = "";
    tags = [Tag.All];

    // Below set via onPluginStart.
    simpleMsgs: ISimpleMsg[] = [];

    title = "";
    // messages: string[] = [];
    // variant = PopupVariant.Primary;
    // callBack: any = undefined;
    neverClose = false;
    showInQueue = false;

    userArgDefaults: UserArg[] = [];
    
    logJob = false;

    /**
     * The variant to use for the popup.
     *
     * @returns {PopupVariant}  The variant to use for the popup.
     */
    get variantToUse(): PopupVariant {
        // No messages.
        if (this.simpleMsgs.length === 0) return PopupVariant.Primary;

        // Variant not defined.
        if (this.simpleMsgs[0].variant === undefined)
            return PopupVariant.Primary;

        // Only one message, so just use that associated variant.
        if (this.simpleMsgs.length == 1) return this.simpleMsgs[0].variant;

        // Get all the variants in this.simpleMsgs. Is there only one unique
        // variant? Then use that one.
        const variants = this.simpleMsgs.map((x) => x.variant);
        const uniqueVariants = Array.from(new Set(variants));
        if (uniqueVariants.length === 1 && uniqueVariants[0] !== undefined) {
            return uniqueVariants[0];
        }

        // Multiple messages. Use Primary variant for whole modal.
        return PopupVariant.Primary;
    }

    /**
     * Runs when the user first starts the plugin. For example, if the plugin is
     * in a popup, this function would open the popup.
     *
     * @param {ISimpleMsg} [payload]  Information about the message to display.
     * @returns {Promise<void>}       Promise that resolves when the plugin is
     *                                finished starting.
     */
    async onPluginStart(payload: ISimpleMsg): Promise<void> {
        if (payload.message === "") {
            // Sometimes this plugin gets called with an empty message. TODO:
            // Not sure why. Good to investigate. Happens, for example, when you
            // try to load PDB ID 9999.
            return;
        }

        // Add datetime string.
        payload.datetime = new Date().toLocaleString();

        // Add at top of list.
        this.simpleMsgs.unshift(payload);

        // get all the titles in this.simpleMsgs. If there is only one unique
        // title, use that. Otherwise, use "Messages".
        const titles = this.simpleMsgs.map((x) => x.title);
        const uniqueTitles = Array.from(new Set(titles));
        this.title = uniqueTitles.length === 1 ? uniqueTitles[0] : "Messages";

        this.neverClose =
            payload.neverClose === undefined ? false : payload.neverClose;

        // TODO: Only do below if one message. If multiple messages, disable
        // programmatic closing of modal.
        this.open = payload.open !== undefined ? payload.open : true;
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
        for (const simpleMsg of this.simpleMsgs) {
            if (simpleMsg.callBack) {
                simpleMsg.callBack();
            }
        }
        this.simpleMsgs = [];
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

        pluginsApi.runPlugin(this.pluginId, {
            title: "Test Title",
            message: "Test message",
            open: true, // open
        } as ISimpleMsg);

        return [];
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
