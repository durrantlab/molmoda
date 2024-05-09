/**
 * Given to timestamps, produces a string that describes the time between the
 * two in seconds.
 *
 * @param {number} timestamp1  The first timestamp.
 * @param {number} timestamp2  The second timestamp.
 * @returns {string}  The time between the two timestamps.
 */
export function timeDiffDescription(
    timestamp1: number,
    timestamp2: number
): string {
    const diffSecs = (timestamp2 - timestamp1) / 1000;
    const roundedSecs = Math.round(diffSecs * 10) / 10;
    const secs = roundedSecs == 1 ? "sec" : "secs";
    return ` (${roundedSecs.toFixed(1)} ${secs})`;
}

/**
 * Given a number of milliseconds since the Unix Epoch, produces a string that
 * describes the time.
 *
 * @param  {number} timestamp  The timestamp.
 * @returns {string}  A description of the time.
 */
export function formatTimestamp(timestamp: number): string {
    if (timestamp === 0) {
        return "";
    }

    // Format string like MM/DD HH:MM
    const date = new Date(timestamp);

    // Get month as 3-letter string
    const monthString = date.toLocaleString("default", { month: "short" });

    const day = date.getDate();
    const hour = date.getHours();

    // minutes are padded with 0s
    const minute = date.getMinutes().toString().padStart(2, "0");

    return `${monthString} ${day}, ${hour}:${minute}`;
}

/**
 * Given a number of seconds, produces a string that describes the time.
 *
 * @param {number} secs  The number of seconds.
 * @returns {string}  A description of the time.
 */
export function secsToTime(secs: number): string {
    const days = Math.floor(secs / 86400);
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;

    let timeStr = "";
    if (days == 1) {
        timeStr += "1 day, ";
    } else if (days > 1) {
        timeStr += `${days} days, `;
    }

    if (hours == 1) {
        timeStr += "1 hr, ";
    } else if (hours > 1) {
        timeStr += `${hours} hrs, `;
    }

    if (minutes == 1) {
        timeStr += "1 min, ";
    } else if (minutes > 1) {
        timeStr += `${minutes} mins, `;
    }

    if (seconds == 1) {
        timeStr += "1 sec";
    } else {
        timeStr += `${seconds.toFixed(1)} secs`;
    }

    return timeStr;
}
