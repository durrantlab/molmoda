import { loadedPlugins } from "@/Plugins/PluginParent";

export const pluginsApi = {
    runPlugin: function(pluginName: string, params?: any) {
        loadedPlugins[pluginName].onPluginStart(params);
    }
}
