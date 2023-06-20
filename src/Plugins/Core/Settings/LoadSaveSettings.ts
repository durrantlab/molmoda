import { visualizationApi } from "@/Api/Visualization";
import { setStoreVar } from "@/Store/StoreExternalAccess";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
// import * as api from "@/Api/";

/**
 * Saves settings to local storage.
 * 
 * @param  {IUserArg[]} settings  The settings to save.
 */
export function saveSettings(settings: IUserArg[]) {
    localStorage.setItem("settings", JSON.stringify(settings));
}

/**
 * Gets settings from local storage.
 * 
 * @returns {IUserArg[]}  The settings.
 */
export function getSettings(): IUserArg[] {
    const settingsJson = localStorage.getItem("settings");
    if (settingsJson === null) {
        return [];
    }
    return JSON.parse(settingsJson) as IUserArg[];
}

/**
 * Gets the value of a specific setting, using default value if not present.
 *
 * @param  {string} name  The name of the setting.
 * @returns {any}  The value of the setting.
 */
export function getSetting(name: string): any {
    const settings = getSettings();
    for (const setting of settings) {
        if (setting.name === name) {
            return setting.val;
        }
    }

    // Get default
    const defaults = defaultSettings();
    for (const settingName in defaults) {
        if (settingName === name) {
            return defaults[settingName];
        }
    }

    return undefined;
}

/**
 * Given settings, apply them (meaning, update app per settings).
 *
 * @param  {IUserArg[]} settings  The settings to apply.
 */
export function applySettings(settings: IUserArg[]) {
    // Convert the settings to a map for easy lookup.
    const settingsMap = new Map<string, IUserArg>();
    for (const setting of settings) {
        settingsMap.set(setting.name, setting);
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

    return { maxProcs: procsToRecommend, molViewer: "3dmol" };
}
