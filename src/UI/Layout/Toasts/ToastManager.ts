import { reactive } from "vue";
import { IToast } from "./ToastInterfaces";
import { randomID } from "@/Core/Utils/MiscUtils";
import { IToastOptions, PopupVariant } from "../Popups/InterfacesAndEnums";
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
 * @param {Function} [callBack] The function to call when the toast is closed.
 * @param {IToastOptions} [options] Additional options for the toast.
 */
export function addToast(
    title: string,
    message: string,
    variant: PopupVariant = PopupVariant.Info,
    callBack?: () => void,
    options?: IToastOptions
) {
    const toastOptions = { ...options }; // Clone to avoid modifying the original object
    // If duration is not specified, calculate it based on word count.
    if (toastOptions.duration === undefined) {
        const words = message.trim().split(/\s+/).length;
        const readingSpeedWPM = 150; // Slow reader speed
        const baseDurationMs = 4000; // Minimum duration
        const extraTimePerWordMs = (60 / readingSpeedWPM) * 1000;
        toastOptions.duration = baseDurationMs + words * extraTimePerWordMs;
    }

    toasts.push({
        id: randomID(),
        title,
        message,
        variant,
        timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
        callBack,
        ...toastOptions,
    });
}
/**
 * Removes all active toasts from the list.
 */
export function clearAllToasts() {
    toasts.length = 0;
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
