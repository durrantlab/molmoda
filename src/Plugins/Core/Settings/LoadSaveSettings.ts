import { jobManagers } from "@/Queue/JobManagers/JobManagerParent";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { goldenLayout } from "@/UI/Layout/GoldenLayout/GoldenLayoutCommon";

export function saveSettings(settings: IUserArg[]) {
    localStorage.setItem("settings", JSON.stringify(settings));

    if (settings.find((s) => s.name === "layout")?.val === "current") {
        const currentLayout = goldenLayout.toConfig();
        localStorage.setItem("currentLayout", JSON.stringify(currentLayout));
    } else {
        localStorage.removeItem("currentLayout");
    }
}

export function getSettings(): IUserArg[] {
    const settingsJson = localStorage.getItem("settings");
    if (settingsJson === null) {
        return [];
    }
    return JSON.parse(settingsJson) as IUserArg[];
}

export function applySettings(settings: IUserArg[]) {
    for (const setting of settings) {
        const name = setting.name;
        const val = setting.val;
        switch (name) {
            case "maxProcs":
                jobManagers
                    .find(
                        (jobManager) =>
                            jobManager.jobManagerName ===
                            "Local (In Browser) Queue"
                    )
                    ?.updateMaxNumProcessors(val);
                break;
            case "molViewer":
                break;
            case "layout":
                // This is handled in GoldenLayoutCommon.ts
                break;
        }
    }
}
