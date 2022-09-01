import * as api from "@/Api";
import { ISimpleMsg, PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";

export const messagesApi = {
    /**
     * Displays a popup message.
     * 
     * @param  {string}       title                        The title of the
     *                                                     popup.
     * @param  {string}       message                      The message to
     *                                                     display.
     * @param  {PopupVariant} [variant=PopupVariant.INFO]  The type of message.
     */
    popupMessage: function (
        title: string,
        message: string,
        variant = PopupVariant.INFO
    ) {
        api.plugins.runPlugin("simplemsg", {
            title,
            message,
            variant,
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
};
