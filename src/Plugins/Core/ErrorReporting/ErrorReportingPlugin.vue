<template>
    <PluginComponent :infoPayload="infoPayload" v-model="open" @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged" :actionBtnTxt="actionBtnTxtToUse" :cancelBtnTxt="cancelBtnTxtToUse"
        :variant="popupVariant" @onMolCountsChanged="onMolCountsChanged">
        <MessageList :messages="errorMsgs" />
        <!-- <div> -->
        <!-- {{ txtToUse }} -->
        <!-- <span v-if="!hasTmpErrorMsg">
                <p>
                    Unfortunately, {{ appName }} encountered an unexpected
                    error. We would like to identify and fix the bug that caused
                    this error. May we send the following error report to our
                    servers to help with future debugging?
                </p>
                <pre>{{ txtToUse }}</pre>
            </span>
            <p v-else>{{ txtToUse }}</p> -->
        <!-- </div> -->
    </PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "../../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../../Parents/PluginParentClass/PluginParentClass";
import { Options } from "vue-class-component";
import {
    ISoftwareCredit,
    IContributorCredit,
} from "@/Plugins/PluginInterfaces";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { appName } from "@/Core/GlobalVars";
import {
    ISimpleMsg,
    PopupVariant,
} from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import * as api from "@/Api";
import MessageList from "@/UI/MessageAlerts/MessageList.vue";
import { reportErrorToServer } from "./ErrorReporting";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";

/**
 * ErrorReportingPlugin
 */
@Options({
    components: {
        PluginComponent,
        MessageList,
    },
})
export default class ErrorReportingPlugin extends PluginParentClass {
    menuPath = null;
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "errorreporting";
    intro = "Report an unexpected error.";
    title = `Unexpected Error!`;
    open = false;

    errorMsgs: ISimpleMsg[] = [];
    msgTxtsSeen: Set<string> = new Set();

    userArgDefaults: UserArg[] = [];

    popupVariant = PopupVariant.Danger;
    tags = [Tag.All];
    // errorTxt = "";
    // onApprove = () => {
    //     return;
    // };

    /**
     * The text to display on the action button.
     *
     * @returns {string} The text to display on the action button.
     */
    get actionBtnTxtToUse(): string {
        // if (this.hasTmpErrorMsg) {
        //     return "";
        // }
        return "Yes, Send the Report";
    }

    /**
     * The text to display on the cancel button.
     *
     * @returns {string} The text to display on the cancel button.
     */
    get cancelBtnTxtToUse(): string {
        // if (this.hasTmpErrorMsg) {
        //     return "Ok";
        // }
        return "No Thanks";
    }

    // get txtToUse(): string {
    //     let errTxt = "";
    //     const fixedErrorTxt = this.errorTxt.replace("TMPERRORMSG:", "");
    //     if (!this.hasTmpErrorMsg) {
    //         errTxt += `<p>Unfortunately, ${this.appName} encountered an unexpected error. We would like to identify and fix the bug that caused this error. May we send the following error report to our servers to help with future debugging?</p>`
    //         errTxt += `<pre>${fixedErrorTxt}</pre>`;
    //     } else {
    //         errTxt += fixedErrorTxt;
    //     }
    //     return errTxt;
    // }

    // get hasTmpErrorMsg(): boolean {
    //     return this.errorTxt.startsWith("TMPERRORMSG:");
    // }

    /**
     * The name of the application.
     *
     * @returns {string} The name of the application.
     */
    get appName(): string {
        return appName;
    }

    /**
     * Runs when the user first starts the plugin. For example, if the plugin is
     * in a popup, this function would open the popup.
     *
     * @param {ISimpleMsg} [errorData]  Information about the message to display.
     * @returns {Promise<void>}       Promise that resolves when the plugin is
     *                                finished starting.
     */
    async onPluginStart(errorData: ISimpleMsg): Promise<void> {
        // Modify the error message.
        let errTxt = "";
        const fixedErrorTxt = errorData.message.replace("TMPERRORMSG:", "");
        if (!errorData.message.startsWith("TMPERRORMSG:")) {
            errTxt += `<p>Unfortunately, ${this.appName} encountered an unexpected error. We would like to identify and fix the bug that caused this error. May we send the following error report to our servers to help with future debugging?</p>`;
            errTxt += `<pre>${fixedErrorTxt}</pre>`;
        } else {
            errTxt += fixedErrorTxt;
        }
        errorData.message = errTxt;

        // Add datetime string.
        errorData.datetime = new Date().toLocaleString();

        // This prevents same message from appearing twice (not useful).
        if (this.msgTxtsSeen.has(errorData.message)) return;
        this.msgTxtsSeen.add(errorData.message);

        this.errorMsgs.unshift(errorData);
        // this.errorTxt = errorData.txt;
        // this.onApprove = errorData.onApprove;
        this.open = true;
    }

    /**
     * Runs when the user presses the action button and the popup closes. Does
     * not run with cancel button.
     */
    onPopupDone() {
        for (const msg of this.errorMsgs) {
            if (msg.callBack) {
                msg.callBack();
            }
        }
        this.errorMsgs = [];
        this.msgTxtsSeen.clear();
    }

    /**
     * Called right before the plugin popup opens.
     */
    async onBeforePopupOpen() {
        // this.errorTxt = "";
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

        const errTxt = "TMPERRORMSG:Test error";

        api.plugins.runPlugin(this.pluginId, {
            message: errTxt,
            callBack: async () => {
                await reportErrorToServer(errTxt);
            },
        });

        return [];
    }
}
</script>

<style scoped></style>
