import { loadCorePluginMenus } from "./Core";
import { loadOptionalPlugins } from "./Optional";

export function loadPlugins(): void {
    // First, the core plugins
    loadCorePluginMenus();

    // Then the optional plugins
    loadOptionalPlugins();
}