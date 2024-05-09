import * as api from "@/Api";
import { deleteAutoSave, stopAutoSaveTimer } from "@/Store/AutoSave";
import { unregisterWarnSaveOnClose } from "@/Store/LoadAndSaveStore";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";

export async function closeDownApp(preMsg = ""): Promise<void> {
    // Get all elements with class hide-on-app-closed
    const elementsToHide = document.querySelectorAll(".hide-on-app-closed");
    elementsToHide.forEach((element: any) => {
        element.style.display = "none"; // Hide each element
    });

    // Clear the autosave
    stopAutoSaveTimer();
    await deleteAutoSave();
    unregisterWarnSaveOnClose();

    api.messages.popupMessage(
        "Session Ended",
        preMsg + "You may now close/reload this tab/window.",
        PopupVariant.Info,
        () => {
            // Reload the page
            window.location.reload();
        }
    );
}
