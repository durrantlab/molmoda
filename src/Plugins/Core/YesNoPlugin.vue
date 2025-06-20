<template>
    <PluginComponent
        :infoPayload="infoPayload"
        v-model="open"
        :cancelBtnTxt='showCancelBtn ? "Cancel" : ""'
        :actionBtnTxt="noBtnTxt"
        :actionBtnTxt2="yesBtnTxt"
        @onPopupDone="onPopupDone"
        @onPopupDone2="yesFunc"
        @onClosed="onClosed"
        @onUserArgChanged="onUserArgChanged"
        :styleBtn1AsCancel="!showCancelBtn"
        :prohibitCancel="!showCancelBtn"
        @onCancel="onCancel"
        @onMolCountsChanged="onMolCountsChanged"
    >
        <!-- :variant="variantToUse" -->
        {{ message }}
    </PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options } from "vue-class-component";
import Popup from "@/UI/MessageAlerts/Popups/Popup.vue";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import {
    ISimpleMsg,
    IYesNoMsg,
    // PopupVariant,
    YesNo,
} from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { pluginsApi } from "@/Api/Plugins";
import MessageList from "@/UI/MessageAlerts/MessageList.vue";
import { Tag } from "./ActivityFocus/ActivityFocusUtils";

/**
 * YesNoPlugin
 */
@Options({
    components: {
        Popup,
        PluginComponent,
        MessageList,
    },
})
export default class YesNoPlugin extends PluginParentClass {
    // @Prop({ required: true }) title!: string;
    // @Prop({ required: true }) message!: string;

    menuPath = null;
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "yesnomsg";
    intro = "";
    tags = [Tag.All];
    message = "";
    yesBtnTxt = "";
    noBtnTxt = "";
    callBack = (val: YesNo) => {
        return;
    };
    showCancelBtn = true;

    title = "";
    showInQueue = false;

    userArgDefaults: UserArg[] = [];
    
    logJob = false;
    logAnalytics = false;
    
    /**
     * Runs when the users presses the yes button.
     */
    yesFunc() {
        this.callBack(YesNo.Yes);

        // Must trigger close manually on this one.
        this.open = false;
    }

    /**
     * Runs when the users presses the no button.
     */
    onPopupDone() {
        this.callBack(YesNo.No);
    }

    /**
     * Runs when the users presses the cancel button.
     */
    onCancel() {
        this.callBack(YesNo.Cancel);
    }

    /**
     * Runs when the user first starts the plugin. For example, if the plugin is
     * in a popup, this function would open the popup.
     *
     * @param {IYesNoMsg} [payload]  Information about the message to display.
     * @returns {Promise<void>}       Promise that resolves when the plugin is
     *                                finished starting.
     */
    async onPluginStart(payload: IYesNoMsg): Promise<void> {
        this.title = payload.title ?? "Question";
        this.message = payload.message;
        this.yesBtnTxt = payload.yesBtnTxt ?? "Yes";
        this.noBtnTxt = payload.noBtnTxt ?? "No";
        this.callBack = payload.callBack;
        this.showCancelBtn = payload.showCancelBtn ?? false;
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

        pluginsApi.runPlugin(this.pluginId, {
            title: "Test Title",
            message: "Test message",
            callBack: () => {
                return;
            },
        } as ISimpleMsg);

        return [];
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
