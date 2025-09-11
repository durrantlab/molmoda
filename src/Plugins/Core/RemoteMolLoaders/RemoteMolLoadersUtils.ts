import * as api from "@/Api";
import { fetcher } from "@/Core/Fetcher";
import { FileInfo } from "@/FileSystem/FileInfo";

/**
 * Loads a remote PDB and sends it to the relevant Vue component.
 *
 * @param {string}  pdbId         The PDB ID to load, e.g. "1A2B".
 * @param {string} [validateUrl]  Whether to validate the url. Defaults to true.
 * @returns {Promise<FileInfo>} A promise that resolves the file info (name,
 *     contents, type).
 */
export async function loadPdbIdToFileInfo(
    pdbId: string,
    validateUrl = true
): Promise<FileInfo> {
    pdbId = pdbId.trim();
    const pdbIdUpper = pdbId.toUpperCase();
    const pdbIdLower = pdbId.toLowerCase();
    const urlsToTry = [
        // RCSB PDB format
        `https://files.rcsb.org/view/${pdbIdUpper}.pdb`,
        // RCSB CIF format
        `https://files.rcsb.org/view/${pdbIdUpper}.cif`,
        // PDBe PDB format
        `https://www.ebi.ac.uk/pdbe/entry-files/download/pdb${pdbIdLower}.ent`,
        // PDBe CIF format
        `https://www.ebi.ac.uk/pdbe/entry-files/download/${pdbIdLower}_updated.cif`,
    ];
    for (const url of urlsToTry) {
        try {
            const fileInfo = await loadRemoteToFileInfo(url, validateUrl);
            // Correct the filename to use the original PDB ID casing, preserving the extension.
            const downloadedExtension = url.split(".").pop() || "pdb";
            fileInfo.name = `${pdbIdUpper}.${downloadedExtension}`;
            // If successful, return the file info immediately
            return fileInfo;
        } catch (error) {
            // Log the failure and continue to the next URL
            console.log(`Failed to load from ${url}, trying next source.`);
        }
    }
    // If all URLs fail, throw an error
    throw new Error(
        `Could not load the PDB ID "${pdbId}". Please check the ID and try again.`
    );
}

/**
 * Loads a remote file and sends it to the relevant Vue component.
 *
 * @param {string}  url           The URL of the remote file to load.
 * @param {string} [validateUrl]  Whether to validate the url. Defaults to true.
 * @returns {Promise<FileInfo>} A promise that resolves the file info (name,
 *     contents, type).
 */
export function loadRemoteToFileInfo(
    url: string,
    validateUrl = true
): Promise<FileInfo> {
    const spinnerId = api.messages.startWaitSpinner();
    return new Promise((resolve, reject) => {
        const urlUpper = url.toUpperCase();
        if (
            validateUrl &&
            urlUpper.slice(0, 7) !== "HTTP://" &&
            urlUpper.slice(0, 8) !== "HTTPS://"
        ) {
            api.messages.stopWaitSpinner(spinnerId);
            reject(`The URL should start with http:// or https://.`);
            return;
        }

        try {
            fetcher(url)
                .then((txt) => {
                    const flnm = url.split("/").pop() as string;
                    api.messages.stopWaitSpinner(spinnerId);
                    return resolve(
                        new FileInfo({
                            name: flnm,
                            contents: txt,
                        })
                    );
                })
                .catch((err) => {
                    api.messages.stopWaitSpinner(spinnerId);
                    reject(err);
                    // reject(`Could not load the URL ${url}: ` + err.message);
                    // api.messages.waitSpinner(false);
                });
        } catch (err) {
            api.messages.stopWaitSpinner(spinnerId);
            reject(err);
        }

        // })
        // .catch((err) => {
        //     api.messages.stopWaitSpinner(spinnerId);
        //     reject(err);
        //     // reject(`Could not load the URL ${url}: ` + err.message);
        //     // api.messages.waitSpinner(false);
        // });
    });
}
