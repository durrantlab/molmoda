// Keep track of all loaded plugins. Useful for loading a plugin independent of
// the menu system. 

import { IMenuEntry } from "@/UI/Navigation/Menu/Menu";
import { PluginParentClass } from "./Parents/PluginParentClass/PluginParentClass";

// the menu system.
export const loadedPlugins: { [key: string]: PluginParentClass } = {};
export let allMenuData: IMenuEntry[] = [];

/**
 * Set the menu data.
 * 
 * @param  {IMenuEntry[]} menuData  The menu data.
 */
export function setAllMenuData(menuData: IMenuEntry[]) {
    allMenuData = menuData;
}

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
}