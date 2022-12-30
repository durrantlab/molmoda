import { store } from "@/Store";
import { setStoreIsDirty } from "@/Store/LoadAndSaveStore";
import * as api from "@/Api";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { biotiteStateKeysToRetain } from "../ParseMolModels/_ParseUsingBiotite";

/**
 * Runs the job when the user wants to save in the .biotite format.
 *
 * @param {string} filename  The filename to save to.
 * @returns {Promise<undefined>}  A promise that resolves when the job is
 *     done.
 */
export function saveBiotite(filename: string): Promise<undefined> {
    // Add .biotite to end if not already there
    if (!filename.endsWith(".biotite")) {
        filename += ".biotite";
    }

    return saveState(filename, store.state).then(() => {
        setStoreIsDirty(false);
        return undefined;
    });
}

/**
 * Saves the state to a file.
 *
 * @param  {string} filename The filename to save to.
 * @param  {any}    state    The state to save.
 * @returns {Promise<any>} A promise that resolves when the save is complete.
 */
function saveState(filename: string, state: any): Promise<any> {
    // To save state to json, GLModel must be converted to IAtom[]. This makes
    // copies (not in place).
    const newMolData = (state.molecules as TreeNodeList).serialize();

    const newState: { [key: string]: any } = {};
    for (const key in state) {
        if (biotiteStateKeysToRetain.indexOf(key) === -1) {
            continue;
        }

        newState[key] = key === "molecules" ? newMolData : state[key];
    }

    const jsonStr = JSON.stringify(newState);

    // Create JSON file (compressed).
    return api.fs.saveTxt(
        new FileInfo({
            name: "biotite_file.json",
            contents: jsonStr,
            compressedName: filename,
        })
    );
}
