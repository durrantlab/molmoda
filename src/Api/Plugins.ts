import { loadedPlugins } from "@/Plugins/PluginParent";
import * as api from "@/Api";

export const pluginsApi = {
    /**
     * Runs a plugin independent on the UI.
     *
     * @param  {string} pluginName  The name of the plugin to run.
     * @param  {any}    [params]    The parameters to pass to the plugin
     *                              (optional).
     */
    runPlugin: function(pluginName: string, params?: any) {
        let log = "Starting plugin: " + pluginName;
        if (params) {
            log += "; parameters: " + JSON.stringify(params);
        }
        api.messages.log(log);
        loadedPlugins[pluginName].onPluginStart(params);
    }
}
