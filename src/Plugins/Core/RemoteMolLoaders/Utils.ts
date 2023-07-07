import * as api from "@/Api";
import { dynamicImports } from "@/Core/DynamicImports";
import { FileInfo } from "@/FileSystem/FileInfo";

/**
 * Loads a remote file and sends it to the relevant Vue component.
 *
 * @param {string}  url           The URL of the remote file to load.
 * @param {string} [validateUrl]  Whether to validate the url. Defaults to true.
 * @returns {Promise<FileInfo>} A promise that resolves the file info (name,
 *     contents, type).
 */
export function loadRemote(url: string, validateUrl = true): Promise<FileInfo> {
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
        
        dynamicImports.axios.module
            .then((axios) => {
                return axios.get(url);
            })
            .then((resp) => {
                const flnm = url.split("/").pop() as string;
                api.messages.waitSpinner(false);
                return resolve(
                    new FileInfo({
                        name: flnm,
                        contents: resp.data as string,
                    })
                );
            })
            .catch((err) => {
                throw err;
                // reject(`Could not load the URL ${url}: ` + err.message);
                // api.messages.waitSpinner(false);
            });
    });
}
