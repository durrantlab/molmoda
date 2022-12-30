// Keep track of all loaded plugins. Useful for loading a plugin independent of

import { PluginParentClass } from "./Parents/PluginParentClass/PluginParentClass";

// the menu system.
export const loadedPlugins: { [key: string]: PluginParentClass } = {};
export const alwaysEnabledPlugins: string[] = [];

/**
 * Register a plugin as loaded.
 * 
 * @param  {PluginParentClass} plugin  The plugin to register.
 */
export function registerLoadedPlugin(plugin: PluginParentClass) {
    // Throw an error if the plugin already registered.
    if (loadedPlugins[plugin.pluginId]) {
        throw new Error(
            `Plugin with id ${plugin.pluginId} already registered.`
        );
    }

    loadedPlugins[plugin.pluginId] = plugin;
    if (plugin.alwaysEnabled) {
        alwaysEnabledPlugins.push(plugin.pluginId);
    }
}