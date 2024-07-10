import compileTimeInfo from "../last_updated.json";
import { getUrlParam } from "./UrlParams";

// These can also be defined via the url parameters (for making task-specific modes).
export const appName = getUrlParam("name", "MolModa") as string;
export const appVersion = getUrlParam("version", "1.0.1") as string;
const appShortDesc = getUrlParam(
    "description",
    "a browser-based drug-discovery suite"
) as string;
export const appDetails = getUrlParam(
    "details",
    `It runs computational-chemistry calculations on your local computer, without requiring extensive remote resources.`
) as string;
export const logoPath = getUrlParam("logo", "img/icons/android-chrome-192x192.png") as string;

export const appIntro = `${appName} ${appVersion} is ${appShortDesc}, brought to you by the <a href="http://durrantlab.com/" target="_blank">Durrant Lab</a>.`;
export const appDescription = `${appIntro} ${appDetails}`;

export const appCompileTime = compileTimeInfo.date;
console.log(appName + " " + appVersion + ".");
console.log("Last compiled: " + appCompileTime);

// Though it is hackish, occasionally I just wait for the popup to open before
// doing anything. Good to define a single global constant that determines this
// wait time.
export const delayForPopupOpenClose = 1000;

// Delay to wait after keypress before reacting. This is to prevent the app from
// reacting to every keypress, which would be slow.
export const formInputDelayUpdate = 1000;
