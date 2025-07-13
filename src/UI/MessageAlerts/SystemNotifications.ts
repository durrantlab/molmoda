import { logoPath } from "@/Core/GlobalVars";
import { toSentenceCase } from "@/Core/Utils/StringUtils";
/**
 * Shows a system notification if permission is granted.
 * It will request permission if not already set.
 *
 * @param {string} title The title of the notification.
 * @param {string} body The body text of the notification.
 */
export async function showSystemNotification(title: string, body: string) {
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        return;
    }
    const show = () => {
        // Safely strip HTML from the body string using DOMParser
        const parser = new DOMParser();
        const doc = parser.parseFromString(body, "text/html");
        const plainTextBody = doc.body.textContent || "";
        const notification = new Notification(toSentenceCase(title), {
            body: plainTextBody,
            icon: logoPath,
        });
        // Add an event listener to focus the window when the notification is clicked.
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    };
    let {permission} = Notification;
    if (permission === "default") {
        try {
            permission = await Notification.requestPermission();
        } catch (error) {
            console.error("Error requesting notification permission:", error);
            return; // Exit if permission request fails
        }
    }
    if (permission === "granted") {
        show();
    }
}

// function toSenteceCase(title: string): string {
//     throw new Error("Function not implemented.");
// }

