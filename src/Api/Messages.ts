import * as api from "@/Api";
import { ISimpleMsg, PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";

export const messagesApi = {
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
    popupError: function (message: string) {
        this.popupMessage("Error", message, PopupVariant.DANGER);
    },
};
