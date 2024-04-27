// TODO: Good to not use localstorage. See https://github.com/dexie/Dexie.js or
// https://github.com/marcuswestin/store.js . Maybe localforage, though it's old.

/**
 * Gets an item from local storage.
 * 
 * @param  {string} key  The key of the item.
 * @returns {string | null}  The item.
 */
export async function localStorageGetItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
}

/**
 * Sets an item in local storage.
 * 
 * @param {string} key  The key of the item.
 * @param {string} value  The value of the item.
 */
export async function localStorageSetItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
}