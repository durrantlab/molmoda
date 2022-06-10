import { sysVars } from "@/Core/SysVars";

export const sysApi = {
    loadStatus: {
        started(val?: boolean) {
            if (val !== undefined) {
                sysVars.loadStatus.started = val;
            }
            return sysVars.loadStatus.started;
        },
        pluginsLoaded(val?: boolean) {
            if (val !== undefined) {
                sysVars.loadStatus.pluginsLoaded = val;
            }
            return sysVars.loadStatus.pluginsLoaded;
        },
        menuFinalized(val?: boolean) {
            if (val !== undefined) {
                sysVars.loadStatus.menuFinalized = val;
            }
            return sysVars.loadStatus.menuFinalized;
        },
        vueRendered(val?: boolean) {
            if (val !== undefined) {
                sysVars.loadStatus.vueRendered = val;
            }
            return sysVars.loadStatus.vueRendered;
        }
    }
}