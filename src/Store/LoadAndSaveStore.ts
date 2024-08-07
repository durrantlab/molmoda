import * as api from "@/Api/";
import * as PluginToTest from "@/Testing/PluginToTest";

export let storeIsDirty = false;

/**
 * Marks the current store as dirty.
 *
 * @param  {boolean} val  Whether its dirty.
 */
export function setStoreIsDirty(val: boolean) {
    storeIsDirty = val;
}

/**
 * Handles the beforeunload event.
 * 
 * @param {Event} e The event.
 */
function handleBeforeUnload(e: Event) {
    if (storeIsDirty) {
        e.preventDefault();

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        e.returnValue = ""; // Required for cross-browser compatibility
        setTimeout(() => {
            // The true means the app is closing.
            api.plugins.runPlugin("savemolecules", true);
        }, 0);
    }
}

/**
 * Sets up the app so a dialog will appear when the user tries to close the
 * window, warning them they should save their work.
 */
export function setupWarnSaveOnClose() {
    if (PluginToTest.pluginToTest === "") {
        // If testing a plugin, don't prompt to save the state on close.

        window.addEventListener("beforeunload", handleBeforeUnload, true);
    }
}

/**
 * Unregisters the warn save on close.
 */
export function unregisterWarnSaveOnClose() {
    window.removeEventListener("beforeunload", handleBeforeUnload, true);
}
