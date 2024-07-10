// NOTE: All requests to remote servers must pass through these functions.

import { dynamicImports } from "./DynamicImports";
import * as pluginsApi from "@/Api/Plugins";
import { delayForPopupOpenClose } from "./GlobalVars";
import { localStorageSetItem } from "./LocalStorage";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { isTest } from "@/Testing/SetupTests";

export enum ResponseType {
    JSON = "json",
    TEXT = "text",
    BLOB = "blob",
    ARRAY_BUFFER = "arraybuffer",
}

interface IFetcherOptions {
    responseType: ResponseType;
}

/**
 * Fetch a file from a remote URL.
 *
 * @param {string} url  The URL of the file to fetch.
 * @param {IFetcherOptions} [options]  The options for the fetch.
 * @returns {Promise<any>} A promise that resolves the fetched file.
 */
export async function fetcher(
    url: string,
    options?: IFetcherOptions
): Promise<any> {
    // If options not specified, figure out what it should be based on the URL.
    if (options === undefined) {
        // if url ends in json, set responseType to JSON
        if (url.toLowerCase().endsWith(".json")) {
            options = {
                responseType: ResponseType.JSON,
            };
        } else {
            options = {
                responseType: ResponseType.TEXT,
            };
        }
    }

    // Determine if it is an external URL. External URLS have http:// or
    // https://, and are not local.
    const urlUpper = url.toUpperCase();
    const startsWithHttp =
        urlUpper.slice(0, 7) === "HTTP://" ||
        urlUpper.slice(0, 8) === "HTTPS://";
    const isExternal =
        startsWithHttp && !url.startsWith(window.location.origin);
    const allowExternalWebAccess = (await getSetting(
        "allowExternalWebAccess"
    )) as boolean;

    let permissionResp = "allowed"; // for internal urls (!isExternal).
    if (isExternal && !allowExternalWebAccess && !isTest) {
        permissionResp = await new Promise((resolve) => {
            // Stop the spinner
            pluginsApi.pluginsApi.runPlugin("fetcherpermission", {
                url,
                onDeny: () => {
                    setTimeout(() => {
                        resolve("denied");
                    }, delayForPopupOpenClose);
                },
                onAllow: () => {
                    setTimeout(() => {
                        resolve("allowed");
                    }, delayForPopupOpenClose);
                },
                onAllowAll: async () => {
                    // TODO: Update settings for allow all

                    localStorageSetItem("allowExternalWebAccess", true);

                    setTimeout(() => {
                        resolve("allowed");
                    }, delayForPopupOpenClose);
                },
            });
        });
    }

    if (permissionResp === "denied") {
        throw new Error("Permission denied; cannot fetch the URL.");
    }

    // Load axios
    const axios = await dynamicImports.axios.module;

    // Fetch the file from the remote URL using axios
    const response = await axios.get(url, options);

    return response.data;
}
