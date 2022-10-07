// Keep track of all loaded plugins. Useful for loading a plugin independent of

import { PluginParentClass } from "./Parents/PluginParentClass/PluginParentClass";

// the menu system.
export const loadedPlugins: { [key: string]: PluginParentClass } = {};
export const alwaysEnabledPlugins: string[] = [];