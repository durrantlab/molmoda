import * as api from "@/Api";
import { deleteAutoSave, stopAutoSaveTimer } from "@/Store/AutoSave";
import { unregisterWarnSaveOnClose } from "@/Core/SaveOnClose/BeforeUnload";
import { PopupVariant } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import { closeElectron } from "../Electron/ElectronUtils";
import { getUrlParam } from "../UrlParams";

/**
 * Constructs the base URL for reloading, optionally retaining the 'focus' parameter.
 *
 * @returns {string} The URL to navigate to.
 */
function _getReloadUrl(): string {
    const focusParamValue = getUrlParam("focus");
    let newUrl = window.location.origin + window.location.pathname;
    if (focusParamValue !== null) {
        newUrl += `?focus=${focusParamValue}`;
    }
    return newUrl;
}

/**
 * Closes down the app by hiding all elements with class hide-on-app, clearing
 * the autosave, unregistering the warn save on close event, reloading the page
 * if showMsg is true,and showing a message to the user.
 *
 * @param {string}  preMsg   Text to prepend to the message that will be shown
 *                           to the user.
 * @param {boolean} showMsg  Whether to show a message to the user.
 * @returns {Promise<void>}  A promise that resolves when the app is closed
 *     down.
 */
export async function closeDownApp(preMsg = "", showMsg = true): Promise<void> {
    // Get all elements with class hide-on-app-closed
    const elementsToHide = document.querySelectorAll(".hide-on-app-closed");
    elementsToHide.forEach((element: any) => {
        element.style.display = "none"; // Hide each element
    });

    // Clear the autosave
    stopAutoSaveTimer();
    await deleteAutoSave();
    unregisterWarnSaveOnClose();

    // Below will close the app if running in electron. So subsequent messages
    // is never shown.
    closeElectron();

    const reloadUrl = _getReloadUrl();

    if (showMsg) {
        api.messages.popupMessage(
            "Session Ended",
            preMsg + "You may now close/reload this tab/window.",
            PopupVariant.Info,
            () => {
                // Reload the page, preserving only the focus parameter if it exists.
                window.location.href = reloadUrl;
            }
        );
    } else {
        // Reload the page, preserving only the focus parameter if it exists.
        window.location.href = reloadUrl;
    }
}
