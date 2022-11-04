import { pluginsApi } from "@/Api/Plugins";
import { pushToStoreList } from "@/Store/StoreExternalAccess";
import {
    ISimpleMsg,
    PopupVariant,
} from "@/UI/Layout/Popups/InterfacesAndEnums";
import { waitSpinner } from "@/UI/MessageAlerts/WaitSpinner";
import { describeParameters, ILog } from "@/UI/Panels/Log/LogUtils";

export const messagesApi = {
    /**
     * Displays a popup message.
     *
     * @param  {string}       title                        The title of the
     *                                                     popup.
     * @param  {string}       message                      The message to
     *                                                     display.
     * @param  {PopupVariant} [variant=PopupVariant.Info]  The type of message.
     * @param  {Function}     [callBack]                   A function to call
     *                                                     when the popup is
     *                                                     closed.
     * @param  {boolean}      [neverClose=false]           If true, the modal
     *                                                     can never be closed.
     * @param  {boolean}      [open=true]                  If false, the modal
     *                                                     (if already open)
     *                                                     will be closed.
     */
    popupMessage: function (
        title: string,
        message = "",
        variant = PopupVariant.Info,
        // eslint-disable-next-line @typescript-eslint/ban-types
        callBack: Function | undefined = undefined,
        neverClose = false
    ) {
        pluginsApi.runPlugin("simplemsg", {
            title,
            message,
            variant,
            neverClose,
            callBack,
            open: true // open
        } as ISimpleMsg);
    },

    closePopupMessage: function () {
        pluginsApi.runPlugin("simplemsg", {
            title: "",
            message: "",
            open: false // close
        } as ISimpleMsg);
    },

    /**
     * Displays an error popup.
     *
     * @param  {string} message  The error message.
     */
    popupError: function (message: string) {
        this.popupMessage("Error", message, PopupVariant.Danger);
    },

    /**
     * Show or hide the mouse spinner to indicate waiting.
     *
     * @param  {boolean} show             Whether to show the spinner.
     * @param  {number}  [timeOut=30000]  The time to wait before hiding the
     *                                    spinner automtically.
     */
    waitSpinner: function (show: boolean, timeOut = 30000) {
        waitSpinner(show, timeOut);
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
