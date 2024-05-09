import {
    localStorageGetItem,
    localStorageRemoveItem,
    localStorageSetItem,
} from "@/Core/LocalStorage";
import { store } from ".";
import { stateToJsonStr } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModa";
import { parseUsingMolModa } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/_ParseUsingMolModa";
import { FileInfo } from "@/FileSystem/FileInfo";
import { pluginsApi } from "@/Api/Plugins";
import { YesNo } from "@/UI/Layout/Popups/InterfacesAndEnums";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";

let timerId: any = undefined;

export async function deleteAutoSave(): Promise<void> {
    await localStorageRemoveItem("autoSave");
}

export function restartAutoSaveTimer() {
    if (timerId !== undefined) {
        clearTimeout(timerId);
    }

    const timerTick = async () => {
        const tickInterval = await getSetting("autoSaveFrequencyMinutes");
        const tickIntervalMS = tickInterval * 60 * 1000;
    
        timerId = setTimeout(async () => {
            // If cookies not allowed, features in unacailable.
            if (!(await localStorageGetItem("allowCookies", false))) {
                timerTick();
                return;
            }

            if (store.state.molecules.length === 0) {
                // Empty. So nothing to autosave.
                await deleteAutoSave();
                timerTick();
                return;
            }

            const dataToSave = stateToJsonStr(store.state);
            localStorageSetItem("autoSave", dataToSave);
            console.log("Auto saved...");
            timerTick();
        }, tickIntervalMS);
    }

    timerTick();
}

async function loadSessionFromLocalStorage() {
    // Cookies are allowed. Check to see if existing autosave.
    const existingAutoSave = await localStorageGetItem("autoSave");
    if (existingAutoSave !== null) {
        const resp = await new Promise((resolve) => {
            pluginsApi.runPlugin("yesnomsg", {
                title: "Restore Unsaved Changes?",
                message:
                    "You have unsaved changes from your last session. Would you like to restore them?",
                callBack: (val: YesNo) => {
                    resolve(val);
                },
                yesBtnTxt: "Restore Session",
                noBtnTxt: "Discard Session",
            });
        });

        if (resp === YesNo.No) {
            await deleteAutoSave();
            return;
        }

        const fileInfo = new FileInfo({
            name: "tmp.molmoda",
            contents: existingAutoSave,
        });
        await parseUsingMolModa(fileInfo);
    }
}

export async function setupAutoSave(): Promise<void> {
    // If cookies not allowed, features in unacailable.
    if (await localStorageGetItem("allowCookies", false)) {
        await loadSessionFromLocalStorage();
    }

    restartAutoSaveTimer();
}
