// Keep track of all loaded plugins. Useful for loading a plugin independent of

import { PluginParentRenderless } from "./Parents/PluginParent/PluginParentRenderless";

// the menu system.
export const loadedPlugins: { [key: string]: PluginParentRenderless } = {};
