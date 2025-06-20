import {
    localStorageGetItem,
    localStorageRemoveItem,
    localStorageSetItem,
} from "@/Core/LocalStorage";
import { store } from ".";
import { stateToJsonStr } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModa";
import { parseUsingMolModa } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/_ParseUsingMolModa";
import { FileInfo } from "@/FileSystem/FileInfo";
import { messagesApi } from "@/Api/Messages";
import { YesNo } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";

let timerId: any = undefined;

/**
 * Deletes the autosave.
 * 
 * @returns {Promise<void>} A promise that resolves when the autosave is deleted.
 */
export async function deleteAutoSave(): Promise<void> {
    await localStorageRemoveItem("autoSave");
}

/**
 * Stops the autosave timer.
 */
export function stopAutoSaveTimer() {
    if (timerId !== undefined) {
        clearTimeout(timerId);
    }
}

/**
 * Restarts the autosave timer.
 */
export function restartAutoSaveTimer() {
    stopAutoSaveTimer();

    const timerTick = async () => {
        const tickInterval = await getSetting("autoSaveFrequencyMinutes");
        if (tickInterval <= 0) {
            // disabled
            return;
        }
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

/**
 * Loads the session from local storage.
 */
async function loadSessionFromLocalStorage() {
    // Cookies are allowed. Check to see if existing autosave.
    const existingAutoSave = await localStorageGetItem("autoSave");
    if (existingAutoSave !== null) {
        const resp = await messagesApi.popupYesNo(
            "You have unsaved changes from your last session. Would you like to restore them?",
            "Restore Unsaved Changes?",
            "Restore Session",
            "Discard Session"
        )
        
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

/**
 * Sets up the autosave.
 */
export async function setupAutoSave(): Promise<void> {
    // If cookies not allowed, features in unacailable.
    if (await localStorageGetItem("allowCookies", false)) {
        await loadSessionFromLocalStorage();
    }

    restartAutoSaveTimer();
}
