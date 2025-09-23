import compileTimeInfo from "../last_updated.json";
import { getUrlParam } from "./UrlParams";
import { sanitizeHtml } from "./Security/Sanitize";
// Putting isTest here to avoid circular dependencies with other modules
export const isTest = getUrlParam("test") !== null;

// localhost or 127.0.0.1 means that the app is running locally.
let _isLocalHost = false;
try {
    _isLocalHost =
        window.location.href.includes("localhost") ||
        window.location.href.includes("127.0.0.1");
} catch (error) {
    _isLocalHost = false;
}
export const isLocalHost = _isLocalHost;

// Check if running on beta site.
let _isBeta = false;
try {
    _isBeta = window.location.href.includes("beta");
} catch (error) {
    _isBeta = false;
}
export const isBeta = _isBeta;

// Detect if running on a mobile device.
export const isMobile =
    typeof window !== "undefined"
        ? window.matchMedia("(max-width: 767px)").matches
        : false;

// Define appVersion, adding ".beta" suffix if on localhost or beta site, but not in test mode.
let versionString = getUrlParam("version", compileTimeInfo.version) as string;
if (!isTest && (isLocalHost || isBeta)) {
    versionString += ".beta";
}

// Though it is hackish, occasionally I just wait for the popup to open before
// doing anything. Good to define a single global constant that determines this
// wait time.
export const delayForPopupOpenClose = 1000;

// Delay to wait after keypress before reacting. This is to prevent the app from
// reacting to every keypress, which would be slow.
export const formInputDelayUpdate = 500;

export let appName = "MolModa";
export const appVersion = versionString;
export let appShortDesc = "a browser-based drug-discovery suite";
export let appDetails = "It runs computational-chemistry calculations on your local computer, without requiring extensive remote resources.";
export let appIntro = "";  // Set in setupGlobalVars
export let appDescription = "";  // Set in setupGlobalVars
export const appCompileTime = compileTimeInfo.date;

export let logoPath = "img/icons/android-chrome-192x192.png";

/** 
 * Sets up global variables like appName, appVersion, appDescription,
 * logoPath, etc. based on URL parameters and sanitizes them.
 * 
 * This function should be called once during application initialization.
 * 
 * @returns {Promise<void>} A promise that resolves when the global variables
 *     have been set up.
 */
export async function setupGlobalVars(): Promise<void> {
    const name = getUrlParam("name", null);
    if (name) {
        // It's given as a url parameter. Need to sanitize and override default (MolModa).
        appName = await sanitizeHtml(name) as string;
    } 

    const description = getUrlParam("description", null);
    if (description) {
        // It's given as a url parameter. Need to sanitize and override default.
        appShortDesc = await sanitizeHtml(description) as string;
    }

    const details = getUrlParam("details", null);
    if (details) {
        // It's given as a url parameter. Need to sanitize and override default.
        appDetails = await sanitizeHtml(details) as string;
    }

    const logo = getUrlParam("logo", null);
    if (logo) {
        // It's given as a url parameter. Need to sanitize and override default.
        logoPath = await sanitizeHtml(logo) as string;
    }

    appIntro = `${appName} ${appVersion} is ${appShortDesc}, brought to you by the <a href="http://durrantlab.com/" target="_blank">Durrant Lab</a>.`;
    appDescription = `${appIntro} ${appDetails}`;

    console.log(appName + " " + appVersion + ".");
    console.log("Last compiled: " + appCompileTime);
}

