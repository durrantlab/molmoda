import { dynamicImports } from "./DynamicImports";
import { PopupVariant } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import * as api from "@/Api/";

let _db: any = undefined;

// Below is used if saving cookies is not allowed.
const memoryStorage: { [key: string]: any } = {};

let lastCookieMsgTime = 0;

/**
 * Creates a database if it doesn't exist.
 *
 * @returns {Promise<any>}  A promise that resolves the database.
 */
async function createDatabaseIfNeeded(): Promise<any> {
    if (_db === undefined) {
        const dexie = await dynamicImports.dexie.module;
        _db = new dexie.Dexie("MolModa");
        _db.version(1).stores({
            data: "++key",
        });
    }
    return _db;
}

/**
 * Checks if cookies are allowed.
 *
 * @param {boolean} [showWarning=true]  Whether to show a warning message if
 *                                     cookies are not allowed.
 * @returns {Promise<boolean>}  A promise that resolves to true if cookies are
 *                              allowed, false otherwise.
 */
async function cookiesAllowed(showWarning = true): Promise<boolean> {
    // NOTE: Intentionally not using isStatCollectionEnabled() here to avoid
    // circular dependency.
    // const canCollect = await isStatCollectionEnabled();
    const canCollect = await localStorageGetItem(
        "statcollection",
        false,
        false
    );

    // Show msg if appropriate. Prevents multiple messages in quick succession.
    if (!canCollect) {
        // Always clear local storage if you can't collect.
        clearLocalStorage();

        // Only show a warning if showWarning is true and at least a second has
        // passed since last warning.
        const now = new Date().getTime();
        if (showWarning && now - lastCookieMsgTime > 1000) {
            lastCookieMsgTime = now;

            api.messages.popupMessage(
                "Cookies Disallowed!", // Just call it a cookie.
                "Your settings will be lost when you reload this page because you have disallowed cookies. Consider enabling cookies for a better user experience in the future.",
                PopupVariant.Warning,
                () => {
                    api.plugins.runPlugin("statcollection");
                }
            );
        }
    }

    return canCollect;
}

/**
 * Gets an item from the database.
 *
 * @param {string} key  The key of the item.
 * @returns {Promise<any>}  A promise that resolves to the item.
 */
async function getItemFromDB(key: string) {
    const db = await createDatabaseIfNeeded();
    return await db.data.where("key").equals(key).first();
}

/**
 * Gets an item from local storage.
 *
 * @param  {string}  key                           The key of the item.
 * @param  {any}     [defaultVal]                  The default value of the
 *                                                 item, if any. If not
 *                                                 specified, returns null.
 * @param  {boolean} [checkIfCookiesAllowed=true]  Whether to check if cookies
 *                                                 are allowed. Should almost
 *                                                 always be true. Only set to
 *                                                 false in rare circumstances
 *                                                 when you need to avoid stack
 *                                                 overflow.
 * @returns {any | null}  The item.
 */
export async function localStorageGetItem(
    key: string,
    defaultVal?: any,
    checkIfCookiesAllowed = true
): Promise<any | null> {
    let result: any = null;
    if (!checkIfCookiesAllowed || (await cookiesAllowed(false))) {
        // Allowed, so get results from local storage.
        result = await getItemFromDB(key);
    } else {
        // If saving cookies not allowed, get the item from memoryStorage.
        result =
            memoryStorage[key] === undefined
                ? undefined
                : { value: memoryStorage[key] };
    }

    // If not found, return null.
    if (result === undefined) {
        return (defaultVal !== undefined) ? defaultVal : null;
    }

    // Check if expired (timestamp)
    if (
        result.expireTimestamp &&
        result.expireTimestamp < new Date().getTime()
    ) {
        // Value exists, but it has expired.
        await localStorageRemoveItem(key);
        return (defaultVal !== undefined) ? defaultVal : null;
    }

    return result.value;
}

/**
 * Sets an item in local storage.
 *
 * @param {string} key             The key of the item.
 * @param {string} value           The value of the item.
 * @param {number} [daysToExpire]  The number of days until the item expires.
 * @param {boolean} [showWarning=true]  Whether to show a warning message if
 *                                      cookies are not allowed.
 */
export async function localStorageSetItem(
    key: string,
    value: any,
    daysToExpire?: number,
    showWarning = true
): Promise<void> {
    let valueToStore = value;
    // Sanitize non-null objects to prevent DataCloneError with IndexedDB.
    // This ensures that complex objects like GoldenLayout state are storable.
    if (value !== null && typeof value === 'object') {
        valueToStore = JSON.parse(JSON.stringify(value));
    }

    // Need to make special exception when key is statcollection. In this case,
    // if the value is true, you can set even if cookiesAllowed returned false.
    // Because this is what makes cookiesAllowed return true.
    const enablingCookiesAllowed = key === "statcollection" && valueToStore === true;
    // You cannot save settings if the user has not consented to cookies.
    if (!enablingCookiesAllowed && !(await cookiesAllowed(showWarning))) {
        // If saving cookies not allowed, set the item to memoryStorage.
        memoryStorage[key] = valueToStore;
        return;
    }

    const db = await createDatabaseIfNeeded();

    const expireTimestamp =
        daysToExpire === undefined
            ? undefined
            : new Date().getTime() + daysToExpire * 24 * 60 * 60 * 1000;

    // Overwrites if already exists (unlike .add).
    await db.data.put({
        key,
        value: valueToStore,
        expireTimestamp,
    });
}

/**
 * Removes an item from local storage.
 *
 * @param {string} key  The key of the item.
 * @returns {Promise<void>}  A promise that resolves when the item is removed.
 */
export async function localStorageRemoveItem(key: string): Promise<void> {
    const db = await createDatabaseIfNeeded();
    await db.data.where("key").equals(key).delete();
}

/**
 * Clears local storage.
 *
 * @returns {Promise<void>}  A promise that resolves when local storage is cleared.
 */
async function clearLocalStorage(): Promise<void> {
    const db = await createDatabaseIfNeeded();
    await db.data.clear();
}
