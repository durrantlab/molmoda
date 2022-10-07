export let onePlugin: string | undefined = undefined;

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