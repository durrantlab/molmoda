import compileTimeInfo from "../last_updated.json";

export let appName = "MolModa";
export let appVersion = "1.0.1";
export const appCompileTime = compileTimeInfo.date;

console.log(appName + " " + appVersion + ".");
console.log("Last compiled: " + appCompileTime);

export const appIntro = `${appName} ${appVersion} is a browser-based drug-discovery suite, brought to you by the <a href="http://durrantlab.com/" target="_blank">Durrant Lab</a>.`;
export const appDetails = `It runs computational-chemistry calculations on your local computer, without requiring extensive remote resources.`;
export const appDescription = `${appIntro} ${appDetails}`

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