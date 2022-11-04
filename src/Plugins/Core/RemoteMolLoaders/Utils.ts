import { IFileInfo } from "@/FileSystem/Types";
import * as api from "@/Api";
import axios from 'axios';

/**
 * Loads a remote file and sends it to the relevant Vue component.
 *
 * @param {string}  url           The URL of the remote file to load.
 * @param {string} [validateUrl]  Whether to validate the url. Defaults to true.
 * @returns {Promise<IFileInfo>} A promise that resolves the file info (name,
 *     contents, type).
 */
export function loadRemote(
    url: string,
    validateUrl = true
): Promise<IFileInfo> {
    api.messages.waitSpinner(true);
    return new Promise((resolve, reject) => {
        const urlUpper = url.toUpperCase();
        if (
            validateUrl &&
            urlUpper.slice(0, 7) !== "HTTP://" &&
            urlUpper.slice(0, 8) !== "HTTPS://"
        ) {
            api.messages.waitSpinner(false);
            reject(`The URL should start with http:// or https://.`);
            return;
        }

        axios.get(url)
            .then((resp) => {
                const flnm = url.split("/").pop() as string;
                api.messages.waitSpinner(false);
                return resolve({
                    name: flnm,
                    contents: resp.data as string,
                    type: flnm.split(".").pop()?.toUpperCase() as string,
                });
            })
            .catch((err) => {
                reject(`Could not load the URL ${url}: ` + err.message);
                api.messages.waitSpinner(false);
            });
    });
}
