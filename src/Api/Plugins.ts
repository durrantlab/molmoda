import * as api from "@/Plugins/LoadedPlugins";

export const pluginsApi = {
    /**
     * Runs a plugin independent on the UI.
     *
     * @param  {string} pluginName  The name of the plugin to run.
     * @param  {any}    [params]    The parameters to pass to the plugin
     *                              (optional).
     */
    runPlugin: function (pluginName: string, params?: any) {
        const plugin = api.loadedPlugins[pluginName];
        if (plugin.onPluginStart !== null) {
            plugin.onPluginStart(params);
        }
    },

    /**
     * Closes all plugins.
     */
    closeAllPlugins: function () {
        for (const pluginName in api.loadedPlugins) {
            const plugin = api.loadedPlugins[pluginName];
            if (plugin.open) {
                plugin.closePopup();
            }
        }
    },
};
