import { pluginsApi } from "@/Api/Plugins";
import { messagesApi } from "@/Api/Messages";
import { ResponseType, fetcher } from "@/Core/Fetcher";
import { getUrlParam } from "@/Core/UrlParams";
import { FileInfo } from "./FileInfo";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { validateShareCode } from "@/Plugins/Core/TemporaryShare/TemporaryShareUtils";
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

    // If url is four characters, assume it's a PDB
    if (url.length === 4) {
        url = `https://files.rcsb.org/download/${url}.pdb`;
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
export async function checkIfUrlOpen(): Promise<void> {
    const params = [
        "open",
        "load",
        "src",
        "file",
        "url",
        "pdb",
        "smi",
        "smiles",
        "code",
    ];
    let urlValue: string | null = null;
    let paramName = "";

    for (const param of params) {
        urlValue = getUrlParam(param);
        if (urlValue !== null) {
            paramName = param;
            break;
        }
    }

    if (urlValue === null) {
        return;
    }

    // Check if the parameter value is a share code, regardless of the parameter name
    if (validateShareCode(urlValue)) {
        const fullUrl = `https://durrantlab.pitt.edu/tmp/${encodeURIComponent(
            urlValue
        )}.molmoda`;
        await openRemoteFile(fullUrl);
        return;
    }

    // If not a share code, proceed with existing logic
    if (paramName !== "" && ["smi", "smiles"].includes(paramName)) {
        const smiles = urlValue as string;
        const fileInfo = new FileInfo({ name: "smiles.smi", contents: smiles });
        const treenode = await TreeNode.loadFromFileInfo({
            fileInfo,
            tag: null,
        });
        if (treenode) {
            const treeNodeList = new TreeNodeList([treenode]);
            treeNodeList.addToMainTree(null);
        }
    } else {
        // Not a SMILES string, treat as a direct URL to a file.
        await openRemoteFile(urlValue as string);
    }
}

/**
 * Set the URL with the open parameter.
 *
 * @param {string} url  The URL to set.
 */
// export function setUrlWithOpen(url: string) {
//     const urlParams = new U_RLSearchParams(window.location.search);
//     urlParams.set("open", url);
//     window.history.replaceState({}, "", `${window.location.pathname}?${urlParams}`);
// }
