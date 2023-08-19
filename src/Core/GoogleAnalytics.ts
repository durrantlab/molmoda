import Cookies from "js-cookie";

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

function injectGoogleAnalytics() {
  // Cookies.get("statcollection") is a cookie that is set when the user accepts the cookie policy
  // If the cookie is set, we load the google analytics script
  // This is done to comply with the GDPR
  // https://developers.google.com/analytics/devguides/collection/gtagjs/user-opt-out
  // Cookies.get returns nothing if the cookie is not set
  if (Cookies.get("ga-inserted")) return;
  else {
    // ommiting the cookie expiration date makes it a session cookie
    Cookies.set("ga-inserted", "true", { sameSite: "strict" });
    // insert google analytics script
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=G-KQT3Z9E322`;
    script.async = true;
    document.head.appendChild(script);
    script.onload = () => {
      window.dataLayer = window.dataLayer || [];
      function gtag(...args: any[]) {
        /* eslint-disable @typescript-eslint/ban-ts-comment */
        // @ts-ignore
        window.dataLayer.push(args);
      }
      gtag("js", new Date());
      gtag("config", "G-KQT3Z9E322");
    };
  }
}

/**
 * Logs an event to Google Analytics.
 *
 * @param  {string} eventName     The event name.
 * @param  {string} eventAction   The event action.
 * @param  {Record<string, any>} [eventOptions]  The event options.
 * @returns {void}
 * @see https://developers.google.com/analytics/devguides/collection/gtagjs/events
 */
export function logEvent(
  eventName: string,
  eventAction: string,
  eventOptions?: Record<string, any>
) {
  injectGoogleAnalytics();
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventAction, {
      event_category: eventName,
      ...eventOptions,
    });
  }
}
