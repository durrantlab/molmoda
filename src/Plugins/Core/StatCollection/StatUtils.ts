import { localStorageGetItem, localStorageRemoveItem, localStorageSetItem } from "@/Core/LocalStorage";

/**
 * Removes the stat-collection cookie.
 */
export async function removeStatCollectionCookie() {
    await localStorageRemoveItem("statcollection");
}

/**
 * Enables stat collection.
 */
export async function enableStats() {
    await removeStatCollectionCookie();
    await localStorageSetItem("statcollection", true);

    // Cookies.set("statcollection", "true", {
    //     // Note that there is a max value you can use. Seems to be around
    //     // 400. Good to use 365.
    //     expires: 365,
    //     sameSite: "strict",
    // });
}

/**
 * Disables stat collection.
 */
export async function disableStats() {
    await removeStatCollectionCookie();

    // NOTE: Below is intentionally commented out. NAR doesn't want any cookies
    // set if used doesn't explicitly authorize.

    // Cookies.set("statcollection", "false", {
    //     expires: 3,
    //     sameSite: "strict",
    // });
}

/**
 * Checks if stat-collection is enabled.
 *
 * @returns {Promise<boolean>}  A promise that resolves whether stat collection
 *                              is enabled.
 */
export async function isStatCollectionEnabled(): Promise<boolean> {
    return await localStorageGetItem("statcollection", false);
}

/**
 * Checks if stat-collection status is set (whether true or false).
 *
 * @returns {Promise<boolean>}  A promise that resolves whether stat collection
 *                              is set.
 */
export async function isStatStatusSet(): Promise<boolean> {
    const status = await localStorageGetItem("statcollection", null);
    return status !== null;
}
