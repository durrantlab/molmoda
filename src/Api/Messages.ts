import * as api from "@/Api";

export const messagesApi = {
    popupMessage: function (title: string, message: string) {
        api.plugins.runPlugin("simplemsg", {
            title,
            message,
        });
    },
    popupError: function (message: string) {
        this.popupMessage("Error", message);
    }
};
