import * as api from "@/Api";
import { deleteAutoSave, stopAutoSaveTimer } from "@/Store/AutoSave";
import { unregisterWarnSaveOnClose } from "@/Core/SaveOnClose/BeforeUnload";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import { closeElectron } from "../Electron/ElectronUtils";

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
export async function closeDownApp(preMsg = "", showMsg=true): Promise<void> {
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

    if (showMsg) {
        api.messages.popupMessage(
            "Session Ended",
            preMsg + "You may now close/reload this tab/window.",
            PopupVariant.Info,
            () => {
                // Reload the page
                window.location.reload();
            }
        );
    } else {
        // Reload the page
        window.location.reload();
    }
}
