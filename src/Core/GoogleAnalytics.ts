import {
    getJsCookie,
    isStatCollectionEnabled,
} from "@/Plugins/Core/StatCollection/StatUtils";

declare global {
    interface Window {
        dataLayer: any[];
        gtag: (
            event: string,
            action: string,
            options?: Record<string, any>
        ) => void;
    }
}

/**
 * Injects the google analytics script if it hasn't been injected already. This
 * is done to comply with the GDPR.
 */
async function injectGoogleAnalyticsScriptIfNeeded() {
    const Cookies = await getJsCookie();

    if (Cookies.get("ga-inserted")) {
        // It's already inserted, so don't do it again.
        return;
    }

    // Ommiting the cookie expiration date makes it a session cookie
    Cookies.set("ga-inserted", "true", { sameSite: "strict" });

    await new Promise((resolve) => {
        // Insert google analytics script
        const script = document.createElement("script");
        script.src = `https://www.googletagmanager.com/gtag/js?id=G-KQT3Z9E322`;
        script.async = true;
        document.head.appendChild(script);
        script.onload = () => {
            window.dataLayer = window.dataLayer || [];
            /**
             * @param  {...any} args  The arguments to pass to gtag.
             */
            const gtag = function (...args: any[]) {
                window.dataLayer.push(args);
            };
            gtag("js", new Date());
            gtag("config", "G-KQT3Z9E322");
            resolve(undefined);
        };
    });
}

/**
 * Logs an event to Google Analytics.
 *
 * @param  {string} eventName                    The event name.
 * @param  {string} eventAction                  The event action.
 * @param  {Record<string, any>} [eventOptions]  The event options.
 * @returns {void}
 * @see
 * https://developers.google.com/analytics/devguides/collection/gtagjs/events
 */
export async function logGAEvent(
    eventName: string,
    eventAction: string,
    eventOptions?: Record<string, any>
) {
    // Cookies.get("statcollection") is a cookie that is set when the user
    // accepts the cookie policy If the cookie is set, we load the google
    // analytics script This is done to comply with the GDPR
    // https://developers.google.com/analytics/devguides/collection/gtagjs/user-opt-out
    // Cookies.get returns nothing if the cookie is not set
    if (!(await isStatCollectionEnabled())) {
        // Stat collection is disabled, so abandon effort.
        return;
    }

    // If runnig from localhost, do a console log instead.
    if (window.location.hostname === "localhost") {
        console.warn(
            `GA Event: ${eventName} - ${eventAction} - ${JSON.stringify(
                eventOptions
            )}`
        );
        return;
    }

    await injectGoogleAnalyticsScriptIfNeeded();

    if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", eventAction, {
            event_category: eventName,
            ...eventOptions,
        });
    }
}
