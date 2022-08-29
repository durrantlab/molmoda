import * as api from "@/Api/";
import { ISaveTxt } from "@/Core/FS";
import {
    atomsToModels,
    modelsToAtoms,
} from "@/FileSystem/LoadSaveMolModels/MolsToFromJSON";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";

export let storeIsDirty = false;
export function setStoreIsDirty(val: boolean) {
    storeIsDirty = val;
}

window.addEventListener(
    "beforeunload",
    function (e) {
        if (storeIsDirty) {
            e.preventDefault();
            e.returnValue = "";
            setTimeout(() => {
                api.plugins.runPlugin("savesession", true);
            }, 0);
        }
    },
    true
);

export function jsonToState(jsonStr: string): Promise<any> {
    // Viewer needs to reload everything, so set viewierDirty to true in all
    // cases. This is a little hackish, but easier than recursing I think.
    jsonStr = jsonStr.replace(/"viewerDirty": *false/g, '"viewerDirty":true');

    // Now convert it to an object.
    const obj = JSON.parse(jsonStr);

    const promises = (obj.molecules as IMolContainer[]).map((mol) =>
        atomsToModels(mol)
    );

    return Promise.all(promises).then((mols: IMolContainer[]) => {
        for (const i in mols) {
            obj.molecules[i] = mols[i];
        }
        return obj;
    });
}

function _stateToJson(state: any): string {
    const newMolData = state.molecules.map((mol: IMolContainer) => {
        return modelsToAtoms(mol);
    });

    const newState: { [key: string]: any } = {};
    for (const key in state) {
        if (key === "molecules") {
            newState[key] = newMolData;
        } else {
            newState[key] = state[key];
        }
    }

    return JSON.stringify(newState);
}

export function saveState(filename: string, state: any): Promise<any> {
    const jsonStr = _stateToJson(state);
    return api.fs.saveTxt({
        fileName: "file.json",
        content: jsonStr,
        ext: ".json",
        compress: {
            fileName: filename,
            ext: ".biotite",
        },
    } as ISaveTxt);
}
