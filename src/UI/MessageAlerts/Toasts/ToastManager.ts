import { reactive } from "vue";
import { IToast } from "./ToastInterfaces";
import { randomID } from "@/Core/Utils/MiscUtils";
import { IToastOptions, PopupVariant } from "../Popups/InterfacesAndEnums";
import { showSystemNotification } from "@/UI/MessageAlerts/SystemNotifications";
import { toTitleCase } from "@/Core/Utils/StringUtils";

/**
 * A reactive array to hold the currently active toast notifications.
 */
export const toasts = reactive<IToast[]>([]);

/**
 * A map to hold the live Bootstrap toast instances, allowing programmatic control.
 */
const toastInstances: { [key: string]: any } = {};

/**
 * Registers a live Bootstrap toast instance with the manager.
 * 
 * @param {string} id The unique ID of the toast.
 * @param {any} instance The live Bootstrap toast instance.
 */
export function registerToastInstance(id: string, instance: any) {
    toastInstances[id] = instance;
}

/**
 * Unregisters a toast instance from the manager.
 * 
 * @param {string} id The unique ID of the toast to unregister.
 */
export function unregisterToastInstance(id: string) {
    delete toastInstances[id];
}

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
    // Do not show duplicate toasts.
    const isDuplicate = toasts.some(
        (toast) => toast.title === title && toast.message === message
    );
    if (isDuplicate) {
        return;
    }

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
        title: toTitleCase(title),
        message,
        variant,
        timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
        callBack,
        ...toastOptions,
    });
    // Show system notification if window is not focused OR if permission has not been set yet.
    if (
        "Notification" in window &&
        (!document.hasFocus() || Notification.permission === "default")
    ) {
        showSystemNotification(title, message);
    }
    // showSystemNotification(title, message);
}

/**
 * Hides all active toasts gracefully.
 * Each toast will be removed from the UI and state after its hide animation completes.
 */
export function clearAllToasts() {
    Object.values(toastInstances).forEach((instance) => {
        if (instance) {
            instance.hide();
        }
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
