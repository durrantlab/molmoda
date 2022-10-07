export let appName = "Biotite";

export function updateAppName(newName: string) {
    // When running just one plugin, name should be updated to reflect plugin.
    appName = newName;
}