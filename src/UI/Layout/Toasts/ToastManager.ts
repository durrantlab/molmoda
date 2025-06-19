import { reactive } from "vue";
import { IToast } from "./ToastInterfaces";
import { randomID } from "@/Core/Utils/MiscUtils";
import { PopupVariant } from "../Popups/InterfacesAndEnums";

/**
 * A reactive array to hold the currently active toast notifications.
 */
export const toasts = reactive<IToast[]>([]);

/**
 * Adds a new toast to the list of active toasts.
 *
 * @param {string} title The title of the toast.
 * @param {string} message The message body of the toast.
 * @param {PopupVariant} [variant=PopupVariant.Info] The color variant of the toast.
 */
export function addToast(
    title: string,
    message: string,
    variant: PopupVariant = PopupVariant.Info
) {
    toasts.push({
        id: randomID(),
        title,
        message,
        variant,
        timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
    });
}

/**
 * Removes a toast from the active list by its ID.
 *
 * @param {string} id The unique ID of the toast to remove.
 */
export function removeToast(id: string) {
    const index = toasts.findIndex((t) => t.id === id);
    if (index > -1) {
        toasts.splice(index, 1);
    }
}
