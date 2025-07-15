import compileTimeInfo from "../last_updated.json";
import { getUrlParam } from "./UrlParams";
import { simpleSanitizeHTML } from "./Security/Sanitize";
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

// These can also be defined via the url parameters (for making task-specific modes).
export const appName = simpleSanitizeHTML(
    getUrlParam("name", "MolModa")
) as string;
// Define appVersion, adding ".beta" suffix if on localhost or beta site, but not in test mode.
let versionString = getUrlParam("version", compileTimeInfo.version) as string;
if (!isTest && (isLocalHost || isBeta)) {
    versionString += ".beta";
}
export const appVersion = versionString;
const appShortDesc = simpleSanitizeHTML(
    getUrlParam("description", "a browser-based drug-discovery suite")
) as string;
export const appDetails = simpleSanitizeHTML(
    getUrlParam(
        "details",
        `It runs computational-chemistry calculations on your local computer, without requiring extensive remote resources.`
    )
) as string;
export const logoPath = getUrlParam(
    "logo",
    "img/icons/android-chrome-192x192.png"
) as string;
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
export const formInputDelayUpdate = 500;
