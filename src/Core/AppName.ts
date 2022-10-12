export let appName = "Biotite";

/**
 * Updates the app name. When running just one plugin, name should be updated to
 * reflect plugin name.
 *
 * @param  {string} newName  The new name.
 */
export function updateAppName(newName: string) {
    appName = newName;
}