import { storeIsDirty } from "./DirtyStore";
import { isTest } from "@/Core/GlobalVars";

/**
 * Handles the beforeunload event.
 *
 * Only triggers the browser's native "Leave site?" confirm dialog when the
 * store is dirty. We intentionally do NOT open the in-app save plugin here,
 * because beforeunload fires before the user decides whether to actually
 * leave: opening the save plugin would clobber the app even when the user
 * cancels the browser dialog and stays on the page.
 *
 * @param {BeforeUnloadEvent} e The event.
 */
function _handleBeforeUnload(e: BeforeUnloadEvent) {
    if (!storeIsDirty) {
        return;
    }
    e.preventDefault();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    e.returnValue = ""; // Required for cross-browser compatibility
}

/**
 * Sets up the warn save on close.
 */
export function setupBeforeUnload() {
    if (!isTest) {
        // If not testing a plugin, don't prompt to save the state on close.
        window.addEventListener("beforeunload", _handleBeforeUnload, true);
    }
}

/**
 * Unregisters the warn save on close.
 */
export function unregisterWarnSaveOnClose() {
    window.removeEventListener("beforeunload", _handleBeforeUnload, true);
}
