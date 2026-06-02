import { store } from "@/Store";
import * as api from "@/Api";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { molmodaStateKeysToRetain } from "../ParseMolModels/_ParseUsingMolModa";
import { setStoreIsDirty } from "@/Core/SaveOnClose/DirtyStore";
import { toRaw } from "vue";
import {
    customSelsAndStyles,
    getDisabledCustomStyleNames,
} from "@/Core/Styling/StyleManager";


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

/**
 * Builds a JSON.stringify replacer that discards only genuinely circular
 * references (an object that appears somewhere on its own ancestor path),
 * while preserving shared references that appear in separate branches.
 *
 * The earlier implementation tracked every object ever visited in a single
 * WeakSet, so any object reachable by two paths (e.g. atom objects shared
 * between an original molecule and a clone the Align plugin derives from it)
 * was mistaken for a cycle and dropped on its second visit. That silently
 * stripped the cloned molecule's atoms, which then reloaded with zero
 * components. Tracking the current path instead fixes this: siblings that
 * share data are no longer treated as cycles.
 *
 * @returns {(key: string, value: any) => any}  A replacer for JSON.stringify.
 */
function makeCircularReplacer(): (key: string, value: any) => any {
    // Path from the root to the value currently being serialized.
    const ancestors: any[] = [];
    return function (this: any, key: string, value: any): any {
        if (typeof value !== "object" || value === null) {
            return value;
        }
        // `this` is the object holding `value`. Pop entries deeper than the
        // holder so `ancestors` reflects the live path, not every object seen.
        while (
            ancestors.length > 0 &&
            ancestors[ancestors.length - 1] !== this
        ) {
            ancestors.pop();
        }
        // Drop only true cycles: `value` already on its own ancestor path.
        if (ancestors.indexOf(value) !== -1) {
            return undefined;
        }
        ancestors.push(value);
        return value;
    };
}

/**
 * Converts the state to a JSON string.
 * 
 * @param {any} state  The state to convert.
 * @returns {string}  The JSON string.
 */
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

    const rawCustomStyles = toRaw(customSelsAndStyles);
    if (Object.keys(rawCustomStyles).length > 0) {
        newState["customSelsAndStyles"] = rawCustomStyles;
        // Persist which custom visualizations are toggled off so the reloaded
        // session reproduces the same enabled/disabled state.
        const disabledCustomStyleNames = getDisabledCustomStyleNames();
        if (disabledCustomStyleNames.length > 0) {
            newState["disabledCustomStyleNames"] = disabledCustomStyleNames;
        }
    }
    return JSON.stringify(newState, makeCircularReplacer());
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
