import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { localStorageGetItem, localStorageSetItem } from "@/Core/LocalStorage";

/**
 * Get the default settings.
 *
 * @returns {any}  The default settings.
 */
export async function defaultSettings(): Promise<any> {
    // Leave one processor free
    const maxProcsAvailable = navigator.hardwareConcurrency || 4;
    const procsToRecommend =
        maxProcsAvailable - 1 > 0 ? maxProcsAvailable - 1 : 1;

    // For allowCookies, try to use existing value if it is available.
    // Otherwise, use false as default.
    const allowCookies = await localStorageGetItem("allowCookies", false);

    return {
        maxProcs: procsToRecommend,
        initialCompoundsVisible: 50,
        molViewer: "3dmol",
        allowCookies: allowCookies,
        allowExternalWebAccess: false,
    };
}

/**
 * Saves settings to local storage. Note that not just accessing local storage
 * directly because this also converts from UserArg[] to an object, considers
 * defaults, etc.
 *
 * @param  {UserArg[]} settings  The settings to save.
 */
export async function saveSettings(settings: UserArg[]) {
    // Convert list of userargs into an object.
    const settingsObj: any = {};
    for (const setting of settings) {
        settingsObj[setting.id] = setting.val;
    }
    delete settingsObj["allowCookiesAlert"];

    // Now get the default values (in cases you need them, and for the keys).
    const defaults = await defaultSettings();

    // Sanity check: if a setting is not in the defaults, throw an error.
    for (const key in settingsObj) {
        if (defaults[key] === undefined) {
            throw new Error(
                `Setting ${key} has no default value specified in defaultSettings().`
            );
        }
    }

    for (const key in defaults) {
        const val =
            settingsObj[key] === undefined ? defaults[key] : settingsObj[key];
        await localStorageSetItem(key, val);  // , 0.000173611);
    }

    // await localStorageSetItem("settings", settings);
}

/**
 * Gets settings from local storage. Not just accessing local storage directly
 * because this accounts for defaults (if not set).
 *
 * @returns {UserArg[]}  The settings.
 */
export async function getSettings(): Promise<{ [key: string]: any }> {
    const settings = await defaultSettings();
    for (const key in settings) {
        // Set to what's in local storage, if available.
        settings[key] = await localStorageGetItem(key, settings[key]);
    }

    return settings;
}

/**
 * Gets the value of a specific setting, using default value if not present. Not
 * just accessing local storage directly because this accounts for defaults (if
 * not set).
 *
 * @param  {string} id  The id of the setting.
 * @returns {any}  The value of the setting.
 */
export async function getSetting(id: string): Promise<any> {
    const settings = await getSettings();
    return settings[id];
}

/**
 * Given settings, apply them (meaning, update app per settings).
 *
 * @param  {any} settings  The settings to apply.
 */
export function applySettings(settings: { [key: string]: any }) {
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
    // const defaults = await defaultSettings();
    // const molViewer = settingsMap.get("molViewer")?.val ?? defaults.molViewer;
    // visualizationApi.viewerObj?.unLoadViewer();
    // setStoreVar("molViewer", molViewer);
}
