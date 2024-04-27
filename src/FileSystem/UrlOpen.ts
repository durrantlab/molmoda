import { pluginsApi } from "@/Api/Plugins";
import { messagesApi } from "@/Api/Messages";
import { ResponseType, fetcher } from "@/Core/Fetcher";

/**
 * Open a remote file using its URL. TODO: Good to move this elsewhere, perhaps
 * in FS.
 *
 * @param {string} url  The URL of the file to open.
 */
export async function openRemoteFile(url: string) {
    if (url === null) {
        return;
    }

    try {
        // Fetch the file from the remote URL using axios
        const blob = await fetcher(url, { responseType: ResponseType.BLOB });

        // Create a File object from the Blob.
        const filename = url.split("/").pop() as string;
        const file = new File([blob], filename, { type: blob.type });

        // Since FileList objects are read-only and can't be directly
        // constructed, we'll need to create an object that mimics its
        // structure.
        const files = [file];

        // Now, pass the 'files' object to the 'openmolecules' plugin.
        pluginsApi.runPlugin("openmolecules", files);
    } catch (error) {
        messagesApi.popupError("Error fetching and opening the file. " + error);
    }
}

/**
 * Check if the URL has an open parameter and open the file if it does.
 * This function is called when the app is loaded.
 * 
 * @returns {Promise<void>}  A promise that resolves when the file is opened.
 */
export async function checkIfUrlOpen() {
    // Check of src is in the url. If it is, get its value.
    const urlParams = new URLSearchParams(window.location.search);
    const url = urlParams.get("open");
    await openRemoteFile(url as string);
}

/**
 * Set the URL with the open parameter.
 *
 * @param {string} url  The URL to set.
 */
// export function setUrlWithOpen(url: string) {
//     const urlParams = new URLSearchParams(window.location.search);
//     urlParams.set("open", url);
//     window.history.replaceState({}, "", `${window.location.pathname}?${urlParams}`);
// }
