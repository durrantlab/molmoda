export let appName = "Biotite";
export let appVersion = "1.0.0";

export const appDescription = `${appName} ${appVersion} is a browser-based suite for computer-aided drug discovery, brought to you by the <a href="http://durrantlab.com/" target="_blank">Durrant Lab</a>. It runs computational-chemistry calculations on your local computer, without requiring extensive remote resources.`;

/**
 * Updates the app name. When running just one plugin, name should be updated to
 * reflect plugin name. TODO: Not currently used, but I think it should be.
 *
 * @param  {string} newName       The new name.
 * @param  {string} [newVersion]  The new version.
 */
export function updateAppName(newName: string, newVersion?: string) {
    appName = newName;
    if (newVersion) {
        appVersion = newVersion;
    }
}