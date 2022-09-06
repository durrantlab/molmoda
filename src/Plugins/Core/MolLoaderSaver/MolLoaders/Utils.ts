import { IFileInfo } from "@/FileSystem/Interfaces";
import * as api from "@/Api";

/**
 * Loads a remote file and sends it to the relevant Vue component.
 *
 * @param {string} url      The URL of the remote file to load.
 * @returns {Promise<IFileInfo>} A promise that resolves the file info (name,
 *     contents, type).
 */
export function loadRemote(url: string): Promise<IFileInfo> {
    api.messages.waitSpinner(true);
    return new Promise((resolve, reject) => {
        const urlUpper = url.toUpperCase();
        if (
            urlUpper.slice(0, 7) !== "HTTP://" &&
            urlUpper.slice(0, 8) !== "HTTPS://"
        ) {
            api.messages.waitSpinner(false);
            reject(`The URL should start with http:// or https://.`);
            return;
        }

        fetch(url)
            .then((response) => {
                if (!response.ok) {
                    api.messages.waitSpinner(false);
                    reject(
                        `Could not load the URL ${url}. Status ` +
                            response.status.toString() +
                            ": " +
                            response.statusText
                    );
                    return;
                } else {
                    return response.text();
                }
            })
            .then((text) => {
                const flnm = url.split("/").pop() as string;
                api.messages.waitSpinner(false);
                return resolve({
                    name: flnm,
                    contents: text as string,
                    type: flnm.split(".").pop()?.toUpperCase() as string,
                });
            })
            .catch((err) => {
                reject(`Could not load the URL ${url}: ` + err.message);
                api.messages.waitSpinner(false);
            });
    });
}
