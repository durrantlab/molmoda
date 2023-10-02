<template>
    <PluginComponent
        :infoPayload="infoPayload"
        v-model="open"
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
        actionBtnTxt="Yes, Send the Report"
        cancelBtnTxt="No Thanks"
        :variant="popupVariant"
    >
        <div>
            <p>
                Unfortunately, {{ appName }} encountered an unexpected error. We
                would like to identify and fix the bug that caused this error.
                May we send the following error report to our servers to help
                with future debugging?
            </p>
            <pre>{{ errorTxt }}</pre>
        </div>
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
import { ITest } from "@/Testing/TestCmd";
import { appName } from "@/Core/AppInfo";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
// import { IErrorData } from "./ErrorReporting";

/**
 * ErrorReportingPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class ErrorReportingPlugin extends PluginParentClass {
    menuPath = null;
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "errorreporting";
    intro = "";
    title = `Unexpected Error!`;
    open = false;

    userArgDefaults: UserArg[] = [];

    popupVariant = PopupVariant.Danger;
    errorTxt = "";
    onApprove = () => { return; };

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
     * @param {any} [errorData]  Information about the message to display.
     * @returns {Promise<void>}       Promise that resolves when the plugin is
     *                                finished starting.
     */
    async onPluginStart(errorData: any): Promise<void> {
        this.errorTxt = errorData.txt;
        this.onApprove = errorData.onApprove;
        this.open = true;
    }

    /**
     * Runs when the user presses the action button and the popup closes. Does
     * not run with cancel button.
     */
    onPopupDone() { 
        this.onApprove();
    }

    
    /**
     * Called right before the plugin popup opens.
     */
    onBeforePopupOpen() {
        this.errorTxt = "";
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
        return [];
    }
}
</script>

<style scoped></style>
