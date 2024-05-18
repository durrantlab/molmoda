import { store } from "@/Store";
import { setStoreIsDirty } from "@/Store/LoadAndSaveStore";
import * as api from "@/Api";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { molmodaStateKeysToRetain } from "../ParseMolModels/_ParseUsingMolModa";

/**
 * Runs the job when the user wants to save in the .molmoda format.
 *
 * @param {string} filename  The filename to save to.
 * @returns {Promise<undefined>}  A promise that resolves when the job is
 *     done.
 */
export function saveMolModa(filename: string): Promise<undefined> {
    // Add .molmoda to end if not already there
    if (!filename.endsWith(".molmoda")) {
        filename += ".molmoda";
    }

    return saveState(filename, store.state).then(() => {
        setStoreIsDirty(false);
        return undefined;
    });
}

export function stateToJsonStr(state: any): string {
    const newMolData = (state.molecules as TreeNodeList).serialize();

    const newState: { [key: string]: any } = {};
    for (const key in state) {
        if (molmodaStateKeysToRetain.indexOf(key) === -1) {
            continue;
        }

        // If it's molecules specifically, use the new (serialized) version, not
        // the existing version.
        newState[key] = key === "molecules" ? newMolData : state[key];
    }

    // Custom replacer function to handle circular references
    const seen = new WeakSet();
    return JSON.stringify(newState, (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                // Circular reference found, discard key or you can replace it with something else
                // console.warn("Circular reference found in state, discarding key", key);
                return;
            }
            seen.add(value);
        }
        return value;
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
    const jsonStr = stateToJsonStr(state);

    // Create JSON file (compressed).
    return api.fs.saveTxt(
        new FileInfo({
            name: "molmoda_file.json",
            contents: jsonStr,
            compressedName: filename,
        })
    );
}
