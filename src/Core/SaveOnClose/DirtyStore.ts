import * as api from "@/Api/";

export let storeIsDirty = false;

/**
 * Marks the current store as dirty.
 *
 * @param  {boolean} val  Whether its dirty.
 */
export function setStoreIsDirty(val: boolean) {
    storeIsDirty = val;
}

export function openSavePluginIfStoreDirty(preventCloseSaveModal = true) {
    if (storeIsDirty) {
        setTimeout(() => {
            // The true means the app is closing.
            api.plugins.runPlugin("savemolecules", preventCloseSaveModal);
        }, 0);
    }
}