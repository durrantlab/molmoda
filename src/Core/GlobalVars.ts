export let appName = "Biotite";
export let appVersion = "1.0.0";

export const appDescription = `${appName} ${appVersion} is a browser-based suite for computer-aided drug discovery, brought to you by the <a href="http://durrantlab.com/" target="_blank">Durrant Lab</a>. It runs computational-chemistry calculations on your local computer, without requiring extensive remote resources.`;

// Though it is hackish, occasionally I just wait for the popup to open before
// doing anything. Good to define a single global constant that determines this
// wait time.
export const delayForPopupOpenClose = 1000;

// Delay to wait after keypress before reacting. This is to prevent the app from
// reacting to every keypress, which would be slow.
export const formInputDelayUpdate = 1000;

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