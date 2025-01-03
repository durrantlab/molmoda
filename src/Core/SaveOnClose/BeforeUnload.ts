import * as PluginToTest from "@/Testing/PluginToTest";
import { openSavePluginIfStoreDirty } from "./DirtyStore";

/**
 * Handles the beforeunload event.
 * 
 * @param {Event} e The event.
 */
function _handleBeforeUnload(e: Event) {
    e.preventDefault();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    e.returnValue = ""; // Required for cross-browser compatibility

    openSavePluginIfStoreDirty(true);
}

export function setupBeforeUnload() {
    if (PluginToTest.pluginToTest === "") {
        // If testing a plugin, don't prompt to save the state on close.
        window.addEventListener("beforeunload", _handleBeforeUnload, true);
    }

}


/**
 * Unregisters the warn save on close.
 */
export function unregisterWarnSaveOnClose() {
    window.removeEventListener("beforeunload", _handleBeforeUnload, true);
}
