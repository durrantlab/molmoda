export let appName = "Biotite";
export let appVersion = "1.0.0";

/**
 * Updates the app name. When running just one plugin, name should be updated to
 * reflect plugin name. TODO: Not currently used, but I think it should be.
 *
 * @param  {string} newName  The new name.
 */
export function updateAppName(newName: string, newVersion?: string) {
    appName = newName;
    if (newVersion) {
        appVersion = newVersion;
    }
}