import * as api from "@/Api/";
import { ISaveTxt } from "@/Core/FS";
import { atomsToModels } from "@/FileSystem/LoadSaveMolModels/MolsToFromJSON";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";

export function jsonToState(jsonStr: string): Promise<any> {
    // Viewer needs to reload everything, so set viewierDirty to true in all
    // cases. This is a little hackish, but easier than recursing I think.
    jsonStr = jsonStr.replace(/"viewerDirty": *false/g, '"viewerDirty":true');

    // Now convert it to an object.
    const obj = JSON.parse(jsonStr);

    const promises = (obj.molecules as IMolContainer[]).map(mol => atomsToModels(mol));
    
    return Promise.all(promises)
    .then((mols: IMolContainer[]) => {
        for (const i in mols) {
            obj.molecules[i] = mols[i];
        }
        return obj;
    });
}

function _stateToJson(state: any): string {
    // Recurse through state and replace model value with "moo"
    function replaceModel(state: any, newObj: any): any {
        // Iterate through properties
        for (const key in state) {
            if (key === "model") {
                newObj[key] = state[key].selectedAtoms({});
            } else if (typeof state[key] === "object") {
                if (state[key].length) {
                    // It's an array.
                    newObj[key] = state[key].map((item: any) => {
                        return replaceModel(item, {});
                    });
                } else {
                    // It's an object. Recurse.
                    newObj[key] = {};
                    replaceModel(state[key], newObj[key]); // *****
                }
            } else {
                // Otherwise, just copy the value
                newObj[key] = state[key];
            }
        }
        return newObj;
    }
    const newObj = replaceModel(state, {});
    try {
        return JSON.stringify(newObj, null, 2);
    } catch (e) {
        // See
        // https://bobbyhadz.com/blog/javascript-typeerror-converting-circular-structure-to-json#:~:text=The%20%22Converting%20circular%20structure%20to,converting%20the%20object%20to%20JSON.
        const getCircularReplacer = () => {
            const seen = new WeakSet();
            return (key: string, value: any) => {
                if (typeof value === "object" && value !== null) {
                    if (seen.has(value)) {
                        return;
                    }
                    seen.add(value);
                }
                return value;
            };
        };

        return JSON.stringify(newObj, getCircularReplacer(), 2);
    }
}

export function saveState(filename: string, state: any): void {
    const jsonStr = _stateToJson(state);
    api.fs.saveTxt({
        fileName: "file.json",
        content: jsonStr,
        ext: ".json",
        compress: {
            fileName: filename,
            ext: ".biotite",
        }
    } as ISaveTxt);
}
