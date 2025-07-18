import { pluginsApi } from "@/Api/Plugins";
import { pushToStoreList } from "@/Store/StoreExternalAccess";
import {
    ISimpleMsg,
    ITableDataMsg,
    IToastOptions,
    IYesNoMsg,
    PopupVariant,
} from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";

// Import startWaitSpinner as startWaitSpinnerSrc
import { startWaitSpinner as startWaitSpinnerSrc } from "@/UI/MessageAlerts/WaitSpinner";
import { stopWaitSpinner as stopWaitSpinnerSrc } from "@/UI/MessageAlerts/WaitSpinner";
import { stopAllWaitSpinners as stopAllWaitSpinnersSrc } from "@/UI/MessageAlerts/WaitSpinner";
import { YesNo } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";

import { describeParameters, ILog } from "@/UI/Panels/Log/LogUtils";
import { ITableData } from "@/UI/Components/Table/Types";
import {
    addToast,
    clearAllToasts,
} from "@/UI/MessageAlerts/Toasts/ToastManager";
import { appName } from "@/Core/GlobalVars";
import { sanitizeHtml } from "@/Core/Security/Sanitize";
export const messagesApi = {
    /**
     * Displays a popup message or a toast notification.
     *
     * @param  {string}        title                        The title of the
     *                                                      popup.
     * @param  {string}        message                      The message to
     *                                                      display.
     * @param  {PopupVariant}  [variant=PopupVariant.Info]  The type of message.
     * @param  {Function}      [callBack]                   A function to call
     *                                                      when the popup is
     *                                                      closed.
     * @param  {boolean}       [neverClose=false]           If true, the modal
     *                                                      can never be closed.
     * @param {IToastOptions}  [toastParams]                If provided,
     *                                                      displays a toast
     *                                                      instead of a modal,
     *                                                      with given options.
     */
    popupMessage: async function (
        title: string,
        message = "",
        variant = PopupVariant.Info,
        callBack: any = undefined,
        neverClose = false,
        toastParams?: IToastOptions
    ): Promise<void> {
        // Sanitize title and message to prevent XSS attacks.
        const sanitizedTitle = await sanitizeHtml(title);
        const sanitizedMessage = await sanitizeHtml(message);

        if (toastParams) {
            if (neverClose) {
                toastParams.duration = 0; // Never autohides
                toastParams.showCloseBtn = false; // No close button
            }
            addToast(sanitizedTitle, sanitizedMessage, variant, callBack, toastParams);
            return;
        }

        // If popup already open, do not open another one.
        pluginsApi.runPlugin("simplemsg", {
            title: sanitizedTitle,
            message: sanitizedMessage,
            variant,
            neverClose,
            callBack,
            open: true, // open
        } as ISimpleMsg);
    },

    /**
     * Closes the popup message.
     */
    closePopupMessage: function () {
        pluginsApi.runPlugin("simplemsg", {
            title: "",
            message: "",
            open: false, // close
        } as ISimpleMsg);
        clearAllToasts();
    },

    /**
     * Displays an error popup.
     *
     * @param  {string}   message     The error message.
     * @param  {Function} [callBack]  A function to call when the popup is
     *                                closed.
     */
    popupError: function (message: string, callBack?: any) {
        this.popupMessage(
            appName + " Error",
            message,
            PopupVariant.Danger,
            callBack
        );
        // Also throw the error to the console, unless it's a test. If you throw
        // this error in a test, it will fail the test, but sometimes failure
        // means the test passes.
        // if (!isTest) {
        //     throw new Error(message);
        // }
    },

    /**
     * Displays a Yes-No popup message.
     *
     * @param  {string}  message          The message to display.
     * @param  {string}  [title]          The title of the popup.
     * @param  {string}  [yesBtnTxt]      The text to use for the yes button.
     * @param  {string}  [noBtnTxt]       The text to use for the no button.
     * @param  {boolean} [showCancelBtn]  Whether to show the cancel button.
     */
    popupYesNo: async function (
        message: string,
        title?: string,
        yesBtnTxt?: string,
        noBtnTxt?: string,
        showCancelBtn?: boolean
    ): Promise<any> {
        return await new Promise((resolve: any, reject: any) => {
            // Add reject parameter
            try {
                pluginsApi.runPlugin("yesnomsg", {
                    title,
                    message,
                    callBack: (val: YesNo) => {
                        resolve(val);
                    },
                    yesBtnTxt,
                    noBtnTxt,
                    showCancelBtn,
                } as IYesNoMsg);
            } catch (error) {
                // Reject the promise if the plugin fails to run
                reject(error);
            }
        });
    },

    /**
     * Displays a popup message.
     *
     * @param  {string}       title          The title of the popup.
     * @param  {string}       message        The message to display.
     * @param  {ITableData}   tableData      The table data to display.
     * @param  {string}       caption        The caption of the table.
     * @param  {number}       [precision=3]  The number of decimal places to
     *                                       display.
     */
    popupTableData: async function(
        title: string,
        message: string,
        tableData: ITableData,
        caption: string,
        precision = 3
    ): Promise<void> {
        const sanitizedTitle = await sanitizeHtml(title);
        const sanitizedMessage = await sanitizeHtml(message);
        // If popup already open, do not open another one.
        pluginsApi.runPlugin("tabledatapopup", {
            title: sanitizedTitle,
            message: sanitizedMessage,
            tableData,
            caption,
            precision,
            open: true, // open
        } as ITableDataMsg);
    },

    /**
     * Starts a wait spinner. Returns an id that can be used to stop the spinner.
     *
     * @param {number} [timeOut=30000]  The timeout in milliseconds.
     * @returns {string}  The id of the spinner.
     */
    startWaitSpinner: function (timeOut = 30000): string {
        return startWaitSpinnerSrc(timeOut);
    },

    /**
     * Stops a wait spinner.
     *
     * @param {string} id  The id of the spinner.
     */
    stopWaitSpinner: function (id: string) {
        stopWaitSpinnerSrc(id);
    },

    /**
     * Stops all wait spinners.
     */
    stopAllWaitSpinners: function () {
        stopAllWaitSpinnersSrc();
    },

    /**
     * Logs a message. Appears in the log at the bottom of the screen.
     *
     * @param {string} message       The message to log.
     * @param {any}    [parameters]  The parameters associated with this log, if
     *                               any.
     * @param {string} [jobId]       The job ID associated with this log, if
     *                               any.
     */
    log: function (message: string, parameters?: any, jobId?: string) {
        // Get current local time as string. Like "2020-01-01 12:00"
        const now = new Date();
        const timestamp = now.toLocaleString("en-US", {
            hour12: true,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
        const timestampInt = Math.round(now.getTime() / 1000);

        const paramDesc = describeParameters(parameters);

        // Add the message to the log
        pushToStoreList("log", {
            timestamp,
            timestampSecs: timestampInt,
            message,
            parameters: paramDesc,
            jobId: jobId,
        } as ILog);
    },
};
