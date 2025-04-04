/* eslint-disable prefer-rest-params */
import { isStatCollectionEnabled } from "@/Plugins/Core/StatCollection/StatUtils";
import { fetcher, ResponseType } from "./Fetcher";

// declare global {
//     interface Window {
//         dataLayer: any[];
//         gtag: (
//             event: string,
//             action: string,
//             options?: Record<string, any>
//         ) => void;
//     }
// }

/**
 * Injects the google analytics script if it hasn't been injected already. This
 * is done to comply with the GDPR.
 */
async function injectGoogleAnalyticsScriptIfNeeded() {
    if ((window as any).gtag !== undefined) {
        // It's already inserted, so don't do it again.
        return;
    }

    await new Promise((resolve) => {
        // Insert google analytics script
        const script = document.createElement("script");
        // Bioti+e - GA4
        script.src = `https://www.googletagmanager.com/gtag/js?id=G-FLN2FB201W`;
        script.async = true;
        document.head.appendChild(script);
        script.onload = () => {
            (window as any).dataLayer = (window as any).dataLayer || [];
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line jsdoc/require-jsdoc
            window.gtag = function () {
                (window as any).dataLayer.push(arguments);
            };

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            window.gtag("js", new Date());

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            window.gtag("config", "G-FLN2FB201W");

            resolve(undefined);
        };
    });
}

/**
 * Logs an event to Google Analytics.
 *
 * @param  {string} eventName                    The event name.
 * @param  {string} eventAction                  The event action.
 * @returns {void}
 * @see
 * https://developers.google.com/analytics/devguides/collection/gtagjs/events
 */
export async function logEvent(
    eventName: string, // e.g., pluginId
    eventAction: string // e.g., "jobSubmitted"
    // eventOptions?: Record<string, any>
) {
    // If running from localhost, do a console log instead.
    const url = window.location.href;
    const gaEventData = `GA Event: ${eventName} - ${eventAction}`;

    // If localhost, 127.0.0.1, or beta in the url, don't log to google
    // analytics. Use "track_debug" to force logging regardless.
    if (!url.includes("?track_debug")) {
        const bannedUrls = ["localhost", "127.0.0.1", "?test=", "beta"]
        for (const bannedUrl of bannedUrls) {
            if (url.indexOf(bannedUrl) !== -1) {
                console.warn(
                    `Analytics not sent from prohibited domain ${bannedUrl}: ${gaEventData}`
                );
                return;
            }
        }
    }

    // Always log IP internally for record keeping. It is anonymized client
    // side, with minimal information stored. I believe it is compliant.
    const formData = new FormData();
    formData.append("e", `${eventName}-${eventAction}`);
    const response = await fetcher(
        "https://durrantlab.pitt.edu/apps/molmoda/e.php",
        {
            responseType: ResponseType.TEXT,
            formPostData: formData,
            cacheBust: true,
        }
    );
    debugger

    // Cookies.get("statcollection") is a cookie that is set when the user
    // accepts the cookie policy If the cookie is set, we load the google
    // analytics script This is done to comply with the GDPR
    // https://developers.google.com/analytics/devguides/collection/gtagjs/user-opt-out
    // Cookies.get returns nothing if the cookie is not set
    if (!(await isStatCollectionEnabled())) {
        // Stat collection is disabled, so abandon effort.
        return;
    }

    await injectGoogleAnalyticsScriptIfNeeded();

    if (
        typeof window !== "undefined" &&
        typeof (window as any).gtag === "function"
    ) {
        console.log(gaEventData);
        const eventActionToUse = `${eventName}-${eventAction}`;
        (window as any).gtag("event", eventActionToUse);
    }
}
