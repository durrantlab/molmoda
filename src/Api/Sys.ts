import { sysVars } from "@/Core/SysVars";

export const sysApi = {
    loadStatus: {
        get started(): boolean { return sysVars.loadStatus.started; },
        set started(val: boolean) { sysVars.loadStatus.started = val; },
        
        get pluginsLoaded(): boolean { return sysVars.loadStatus.pluginsLoaded; },
        set pluginsLoaded(val: boolean) { sysVars.loadStatus.pluginsLoaded = val; },

        get menuFinalized(): boolean { return sysVars.loadStatus.menuFinalized; },
        set menuFinalized(val: boolean) { sysVars.loadStatus.menuFinalized = val; },

        get vueRendered(): boolean { return sysVars.loadStatus.vueRendered; },
        set vueRendered(val: boolean) { sysVars.loadStatus.vueRendered = val; },
    }
}