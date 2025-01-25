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

/**
 * Opens the save plugin if the store is dirty.
 *
 * @param {boolean} [preventCloseSaveModal=true]  Whether to prevent closing the
 *                                                save modal. Default is true.
 */
export function openSavePluginIfStoreDirty(preventCloseSaveModal = true) {
    if (storeIsDirty) {
        setTimeout(() => {
            // The true means the app is closing.
            api.plugins.runPlugin("savemolecules", preventCloseSaveModal);
        }, 0);
    }
}