import * as api from "@/Api";
import { pushToStoreList } from "@/Store";
import {
    ISimpleMsg,
    PopupVariant,
} from "@/UI/Layout/Popups/InterfacesAndEnums";
import { waitSpinner } from "@/UI/MessageAlerts/WaitSpinner";

export const messagesApi = {
    /**
     * Displays a popup message.
     *
     * @param  {string}       title                        The title of the
     *                                                     popup.
     * @param  {string}       message                      The message to
     *                                                     display.
     * @param  {PopupVariant} [variant=PopupVariant.INFO]  The type of message.
     * @param  {Function}     [callBack]                   A function to call
     *                                                     when the popup is
     *                                                     closed.
     * @param  {boolean}      [neverClose=false]           If true, the modal
     *                                                     can never be closed.
     */
    popupMessage: function (
        title: string,
        message: string,
        variant = PopupVariant.INFO,
        // eslint-disable-next-line @typescript-eslint/ban-types
        callBack: Function | undefined = undefined,
        neverClose = false
    ) {
        api.plugins.runPlugin("simplemsg", {
            title,
            message,
            variant,
            neverClose,
            callBack,
        } as ISimpleMsg);
    },

    /**
     * Displays an error popup.
     *
     * @param  {string} message  The error message.
     */
    popupError: function (message: string) {
        this.popupMessage("Error", message, PopupVariant.DANGER);
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
     * @param {string} msg  The message to log.
     */
    log: function(msg: string) {
        // Get current local time as string.
        const now = new Date();
        // Like "2020-01-01 12:00"
        const timeStr = now.toLocaleString("en-US", {
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
        
        // Add the message to the log
        pushToStoreList("log", {timestamp: timeStr, message: msg});
    }
};
