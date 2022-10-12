export let onePlugin: string | undefined = undefined;

/**
 * If a plugin is specified via the "plugin" url parameter, sets that name to a
 * globally accessible variable. That variable is in turn used to modify the
 * suite when running in one-plugin mode.
 */
export function setOnePlugin() {
    // Search url for parameter "plugin". If found, set onePlugin to that value.
    // If not found, set onePlugin to undefined.
    
    const pluginParam = new URLSearchParams(window.location.search).get("plugin");
    if (pluginParam !== null) {
        onePlugin = pluginParam;
    } else {
        onePlugin = undefined;
    }
}