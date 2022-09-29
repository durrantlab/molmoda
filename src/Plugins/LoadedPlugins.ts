// Keep track of all loaded plugins. Useful for loading a plugin independent of

import { PluginParent } from "./Parents/PluginParent/PluginParent";

// the menu system.
export const loadedPlugins: { [key: string]: PluginParent } = {};
