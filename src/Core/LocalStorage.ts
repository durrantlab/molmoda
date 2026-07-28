import { dynamicImports } from "./DynamicImports";
import { PopupVariant } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import { messagesApi } from "@/Api/Messages";
import { pluginsApi } from "@/Api/Plugins";

let _db: any = undefined;

// Below is used if saving cookies is not allowed.
const memoryStorage: { [key: string]: any } = {};

let lastCookieMsgTime = 0;

// How long to wait for an IndexedDB operation before giving up. WebKit/Safari
// can leave indexedDB.open() (and the first transaction) pending indefinitely,
// notably when a prior connection from a reused browser session has not closed.
// main() awaits getSettings() before mount(), so an unbounded request stalls
// the whole app on a blank page. On timeout we fall back to in-memory storage
// so the app still starts.
const DB_OP_TIMEOUT_MS = 5000;

// Set once an IndexedDB request times out or errors, so later calls skip the DB
// (avoiding a fresh multi-second stall per settings key) and use memoryStorage.
let _dbUnavailable = false;

/**
 * Races an IndexedDB operation against a timeout so a hung Safari request can
 * never block the caller. On timeout or error the database is marked
 * unavailable so subsequent calls skip it and fall back to in-memory storage.
 *
 * @param {Promise<T>} op  The database operation to guard.
 * @returns {Promise<T | undefined>}  The result, or undefined if it did not
 *     settle in time or rejected.
 */
async function guardDbOp<T>(op: Promise<T>): Promise<T | undefined> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<undefined>((resolve) => {
        timer = setTimeout(() => {
            _dbUnavailable = true;
            resolve(undefined);
        }, DB_OP_TIMEOUT_MS);
    });
    try {
        return await Promise.race([op, timeout]);
    } catch {
        _dbUnavailable = true;
        return undefined;
    } finally {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
    }
}

/**
 * Creates a database if it doesn't exist.
 *
 * @returns {Promise<any>}  A promise that resolves the database, or undefined
 *     if IndexedDB is unavailable (e.g. a Safari open-hang).
 */
async function createDatabaseIfNeeded(): Promise<any> {
    if (_dbUnavailable) {
        return undefined;
    }
    if (_db === undefined) {
        const dexie = await dynamicImports.dexie.module;
        const db = new dexie.Dexie("MolModa");
        db.version(1).stores({
            data: "++key",
        });
        // Open explicitly under a timeout rather than letting Dexie auto-open
        // on first access, so a WebKit open-hang cannot block bootstrap.
        const opened = await guardDbOp(db.open());
        if (opened === undefined) {
            _dbUnavailable = true;
            return undefined;
        }
        _db = db;
    }
    return _db;
}

/**
 * Checks if cookies are allowed.
 *
 * @param {boolean} [showWarning]  Whether to show a warning message if cookies
 *                                 are not allowed. Default is true.
 * @returns {Promise<boolean>}     A promise that resolves to true if cookies
 *                                 are allowed, false otherwise.
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
    // console.log(`[cookiesAllowed] canCollect=${canCollect}, showWarning=${showWarning}, now-last=${new Date().getTime() - lastCookieMsgTime}ms`);

    // Show msg if appropriate. Prevents multiple messages in quick succession.
    if (!canCollect) {
        // Always clear local storage if you can't collect.
        clearLocalStorage();

        // Only show a warning if showWarning is true and at least a second has
        // passed since last warning.
        const now = new Date().getTime();
        if (showWarning && now - lastCookieMsgTime > 1000) {
            // console.log("[cookiesAllowed] about to fire popupMessage");
            lastCookieMsgTime = now;

            messagesApi.popupMessage(
                "Cookies Disallowed!", // Just call it a cookie.
                "Your settings will be lost when you reload this page because you have disallowed cookies. Consider enabling cookies for a better user experience in the future.",
                PopupVariant.Warning,
                () => {
                    pluginsApi.runPlugin("statcollection");
                }
            );
            // console.log("[cookiesAllowed] popupMessage returned");

            // This popup was causing a circular dependency. Replaced with a console warning.
            // The user will be prompted to enable cookies by the StatCollectionPlugin anyway.
            // console.warn(
            //     "Cookies Disallowed! Your settings will be lost when you reload this page. Consider enabling cookies via Help > Plugin Info > StatCollection."
            // );
        } else if (showWarning) {
            // console.log(`[cookiesAllowed] SUPPRESSED: within 1000ms window (${now - lastCookieMsgTime}ms since last)`);
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
    if (db === undefined) {
        // IndexedDB unavailable; mirror the memoryStorage shape used elsewhere.
        return memoryStorage[key] === undefined
            ? undefined
            : { value: memoryStorage[key] };
    }
    return await guardDbOp(db.data.where("key").equals(key).first());
}

/**
 * Gets an item from local storage.
 *
 * @param  {string}  key                      The key of the item.
 * @param  {any}     [defaultVal]             The default value of the item, if
 *                                            any. If not specified, returns
 *                                            null.
 * @param  {boolean} [checkIfCookiesAllowed]  Whether to check if cookies are
 *                                            allowed. Should almost always be
 *                                            true. Only set to false in rare
 *                                            circumstances when you need to
 *                                            avoid stack overflow. Default is
 *                                            true.
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
        return defaultVal !== undefined ? defaultVal : null;
    }

    // Check if expired (timestamp)
    if (
        result.expireTimestamp &&
        result.expireTimestamp < new Date().getTime()
    ) {
        // Value exists, but it has expired.
        await localStorageRemoveItem(key);
        return defaultVal !== undefined ? defaultVal : null;
    }

    return result.value;
}

/**
 * Sets an item in local storage.
 *
 * @param {string} key             The key of the item.
 * @param {string} value           The value of the item.
 * @param {number} [daysToExpire]  The number of days until the item expires.
 * @param {boolean} [showWarning]  Whether to show a warning message if cookies
 *                                 are not allowed. Default is true.
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
    if (value !== null && typeof value === "object") {
        valueToStore = JSON.parse(JSON.stringify(value));
    }

    // Need to make special exception when key is statcollection. In this case,
    // if the value is true, you can set even if cookiesAllowed returned false.
    // Because this is what makes cookiesAllowed return true.
    const enablingCookiesAllowed =
        key === "statcollection" && valueToStore === true;
    // You cannot save settings if the user has not consented to cookies.
    if (!enablingCookiesAllowed && !(await cookiesAllowed(showWarning))) {
        // If saving cookies not allowed, set the item to memoryStorage.
        memoryStorage[key] = valueToStore;
        return;
    }

    const db = await createDatabaseIfNeeded();
    if (db === undefined) {
        // IndexedDB unavailable; keep the value in memory for this session.
        memoryStorage[key] = valueToStore;
        return;
    }

    const expireTimestamp =
        daysToExpire === undefined
            ? undefined
            : new Date().getTime() + daysToExpire * 24 * 60 * 60 * 1000;

    // Overwrites if already exists (unlike .add).
    await guardDbOp(
        db.data.put({
        key,
        value: valueToStore,
        expireTimestamp,
        })
    );
}

/**
 * Removes an item from local storage.
 *
 * @param {string} key  The key of the item.
 * @returns {Promise<void>}  A promise that resolves when the item is removed.
 */
export async function localStorageRemoveItem(key: string): Promise<void> {
    const db = await createDatabaseIfNeeded();
    if (db === undefined) {
        delete memoryStorage[key];
        return;
    }
    await guardDbOp(db.data.where("key").equals(key).delete());
}

/**
 * Clears local storage.
 *
 * @returns {Promise<void>}  A promise that resolves when local storage is cleared.
 */
async function clearLocalStorage(): Promise<void> {
    const db = await createDatabaseIfNeeded();
    if (db === undefined) {
        for (const key in memoryStorage) {
            delete memoryStorage[key];
        }
        return;
    }
    await guardDbOp(db.data.clear());
}
