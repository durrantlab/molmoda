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
 * Sets up the app so a dialog will appear when the user tries to close the
 * window, warning them they should save their work.
 */
export function setupWarnSaveOnClose() {
    if (PluginToTest.pluginToTest === "") {
        // If testing a plugin, don't prompt to save the state on close.

        window.addEventListener(
            "beforeunload",
            function (e) {
                if (storeIsDirty) {
                    e.preventDefault();
                    e.returnValue = "";
                    setTimeout(() => {
                        api.plugins.runPlugin("savemolecules", true);
                    }, 0);
                }
            },
            true
        );
    }
}
