import { visualizationApi } from "@/Api/Visualization";
import { setStoreVar } from "@/Store/StoreExternalAccess";
import { IGenericUserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
// import * as api from "@/Api/";

/**
 * Saves settings to local storage.
 * 
 * @param  {IGenericUserArg[]} settings  The settings to save.
 */
export function saveSettings(settings: IGenericUserArg[]) {
    localStorage.setItem("settings", JSON.stringify(settings));
}

/**
 * Gets settings from local storage.
 * 
 * @returns {IGenericUserArg[]}  The settings.
 */
export function getSettings(): IGenericUserArg[] {
    const settingsJson = localStorage.getItem("settings");
    if (settingsJson === null) {
        return [];
    }
    return JSON.parse(settingsJson) as IGenericUserArg[];
}

/**
 * Gets the value of a specific setting, using default value if not present.
 *
 * @param  {string} id  The id of the setting.
 * @returns {any}  The value of the setting.
 */
export function getSetting(id: string): any {
    const settings = getSettings();
    for (const setting of settings) {
        if (setting.id === id) {
            return setting.val;
        }
    }

    // Get default
    const defaults = defaultSettings();
    for (const settingId in defaults) {
        if (settingId === id) {
            return defaults[settingId];
        }
    }

    return undefined;
}

/**
 * Given settings, apply them (meaning, update app per settings).
 *
 * @param  {IGenericUserArg[]} settings  The settings to apply.
 */
export function applySettings(settings: IGenericUserArg[]) {
    // Convert the settings to a map for easy lookup.
    const settingsMap = new Map<string, IGenericUserArg>();
    for (const setting of settings) {
        settingsMap.set(setting.id, setting);
    }
    const defaults = defaultSettings();

    const molViewer = settingsMap.get("molViewer")?.val ?? defaults.molViewer;
    visualizationApi.viewer?.unLoadViewer();
    setStoreVar("molViewer", molViewer);
}

/**
 * Get the default settings.
 * 
 * @returns {any}  The default settings.
 */
export function defaultSettings(): any {
    // Leave one processor free
    const maxProcsAvailable = navigator.hardwareConcurrency || 4;
    const procsToRecommend =
    maxProcsAvailable - 1 > 0 ? maxProcsAvailable - 1 : 1;
    
    return { maxProcs: procsToRecommend, initialCompoundsVisible: 10, molViewer: "3dmol" };
}
