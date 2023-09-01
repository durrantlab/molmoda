import { dynamicImports } from "@/Core/DynamicImports";

let Cookies: any = undefined;

/**
 * Gets the js-cookie module.
 *
 * @returns {Promise<any>}  A promise that resolves the js-cookie module.
 */
export async function getJsCookie(): Promise<any> {
    return dynamicImports.jsCookie.module;
}

/**
 * Removes the stat-collection cookie.
 */
export async function removeStatCollectionCookie() {
    if (Cookies === undefined) {
        Cookies = await getJsCookie();
    }
    Cookies.remove("statcollection");
}


/**
 * Enables stat collection.
 */
export async function enableStats() {
    if (Cookies === undefined) {
        Cookies = await getJsCookie();
    }
    await removeStatCollectionCookie();
    Cookies.set("statcollection", "true", {
        // Note that there is a max value you can use. Seems to be around
        // 400. Good to use 365.
        expires: 365,
        sameSite: "strict",
    });
}

/**
 * Disables stat collection.
 */
export async function disableStats() {
    if (Cookies === undefined) {
        Cookies = await getJsCookie();
    }
    await removeStatCollectionCookie();
    Cookies.set("statcollection", "false", {
        expires: 3,
        sameSite: "strict",
    });
}

/**
 * Checks if stat-collection is enabled.
 *
 * @returns {Promise<boolean>}  A promise that resolves whether stat collection
 *                              is enabled.
 */
export async function isStatCollectionEnabled(): Promise<boolean> {
    if (Cookies === undefined) {
        Cookies = await getJsCookie();
    }

    const status = Cookies.get("statcollection");

    if (status === undefined) {
        return false;
    }

    return status === "true";
}

/**
 * Checks if stat-collection status is set (whether true or false).
 *
 * @returns {Promise<boolean>}  A promise that resolves whether stat collection
 *                              is set.
 */
export async function isStatStatusSet(): Promise<boolean> {
    if (Cookies === undefined) {
        Cookies = await getJsCookie();
    }

    const status = Cookies.get("statcollection");

    return !(status === undefined);
}
