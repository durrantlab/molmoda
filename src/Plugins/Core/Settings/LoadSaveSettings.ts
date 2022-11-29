import { jobManagers } from "@/Queue/JobManagers/JobManagerParent";
import { setStoreVar } from "@/Store/StoreExternalAccess";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import * as api from "@/Api/";

export function saveSettings(settings: IUserArg[]) {
    localStorage.setItem("settings", JSON.stringify(settings));
}

export function getSettings(): IUserArg[] {
    const settingsJson = localStorage.getItem("settings");
    if (settingsJson === null) {
        return [];
    }
    return JSON.parse(settingsJson) as IUserArg[];
}

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

export function applySettings(settings: IUserArg[]) {
    // Convert the settings to a map for easy lookup.
    const settingsMap = new Map<string, IUserArg>();
    for (const setting of settings) {
        settingsMap.set(setting.name, setting);
    }
    const defaults = defaultSettings();

    // maxProcs in mapping? Use that as maxProcs if so. Otherwise, default.
    const maxProcs = settingsMap.get("maxProcs")?.val ?? defaults.maxProcs;
    jobManagers
        .find(
            (jobManager) =>
                jobManager.jobManagerName === "Local (In Browser) Queue"
        )
        ?.updateMaxNumProcessors(maxProcs);

    const molViewer = settingsMap.get("molViewer")?.val ?? defaults.molViewer;
    api.visualization.viewer?.unLoadViewer();
    setStoreVar("molViewer", molViewer);
}

export function defaultSettings(): any {
    // Leave one processor free
    const maxProcsAvailable = navigator.hardwareConcurrency || 4;
    const procsToRecommend =
        maxProcsAvailable - 1 > 0 ? maxProcsAvailable - 1 : 1;

    return { maxProcs: procsToRecommend, molViewer: "3dmol" };
}
