import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { isStatCollectionEnabled } from "../StatCollection/StatUtils";
import * as api from "@/Api/";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import { localStorageGetItem, localStorageSetItem } from "@/Core/LocalStorage";

/**
 * Saves settings to local storage.
 *
 * @param  {UserArg[]} settings  The settings to save.
 */
export async function saveSettings(settings: UserArg[]) {
    // You cannot save settings if the user has not consented to cookies.
    if (!(await isStatCollectionEnabled())) {
        api.messages.popupMessage(
            "Cookies Disallowed!",
            "Your settings will be lost when you reload this page because you have disallowed cookies. Consider enabling cookies for a better user experience.",
            PopupVariant.Warning,
            () => {
                api.plugins.runPlugin("statcollection");
            }
        );
        return;
    }

    await localStorageSetItem("settings", JSON.stringify(settings));
}

/**
 * Gets settings from local storage.
 *
 * @returns {UserArg[]}  The settings.
 */
export async function getSettings(): Promise<UserArg[]> {
    const settingsJson = await localStorageGetItem("settings");
    if (settingsJson === null) {
        return [];
    }
    return JSON.parse(settingsJson) as UserArg[];
}

/**
 * Gets the value of a specific setting, using default value if not present.
 *
 * @param  {string} id  The id of the setting.
 * @returns {any}  The value of the setting.
 */
export async function getSetting(id: string): Promise<any> {
    const settings = await getSettings();
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
 * @param  {UserArg[]} settings  The settings to apply.
 */
export function applySettings(settings: UserArg[]) {
    // NOTE: Previously this was necessary to change the molecular viewer
    // without having to reload. We're now just using one viewer, but good to
    // leave this function here in case you ever want to implement something
    // similar (not just changing setting values, but actually changing
    // something in the UI).
    // Convert the settings to a map for easy lookup.
    // const settingsMap = new Map<string, UserArg>();
    // for (const setting of settings) {
    //     settingsMap.set(setting.id, setting);
    // }
    // const defaults = defaultSettings();
    // const molViewer = settingsMap.get("molViewer")?.val ?? defaults.molViewer;
    // visualizationApi.viewerObj?.unLoadViewer();
    // setStoreVar("molViewer", molViewer);
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

    return {
        maxProcs: procsToRecommend,
        initialCompoundsVisible: 50,
        molViewer: "3dmol",
    };
}
