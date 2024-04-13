/**
 * Given text, create a text slug.
 *
 * @param  {string}  text             The text to slugify.
 * @param  {boolean} [lowerCase=true] Whether to lowercase the slug.
 * @returns {string} The slugified text.
 */
export function slugify(text: string, lowerCase = true): string {
    if (lowerCase) {
        text = text.toLowerCase();
    }
    return text
        .replace(/[:.]/g, "-")
        .replace(/[^\w -]+/g, "")
        .replace(/ +/g, "-");
}

/**
 * Create a random id.
 *
 * @param  {number} [l=13] The length of the id.
 * @returns {string} The random id.
 */
export function randomID(l = 13): string {
    return (
        "id_" +
        Math.random()
            .toString(36)
            .substring(2, 2 + l)
    );
    //  + Math.random().toString(36).substring(2, 15);
}
/**
 * Capitalizes the first letter of a string.
 *
 * @param  {string} s The string to capitalize.
 * @returns {string} The capitalized string.
 */
export function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Given a string, keep removing everything but letters and numbers from end of
 * string. This is useful for removing terminal punctuation.
 *
 * @param  {string} s  The string to remove punctuation from.
 * @returns {string}  The string without punctuation.
 */
export function removeTerminalPunctuation(s: string): string {
    // eslint-disable-next-line regexp/no-dupe-characters-character-class
    while (s.length > 0 && !s[s.length - 1].match(/[a-zA-Z\d]/i)) {
        s = s.slice(0, -1);
    }
    return s;
}

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
 * Given a string, returns true if it is a sentence.
 *
 * @param {string} txt  The string to check.
 * @returns {boolean}  True if the string is a sentence.
 */
export function isSentence(txt: string): boolean {
    if (txt === undefined) {
        return true;
    }

    if (txt.length === 0) {
        return true;
    }

    // Strip out html tags
    txt = txt.replace(/(<([^>]+)>)/g, "");

    // Trim whitespace
    txt = txt.trim();

    // If first letter is not capitalized, it's not a sentence.
    if (txt[0] !== txt[0].toUpperCase()) {
        return false;
    }

    // If last character is not punctuation, it's not a sentence.
    const lastChar = txt[txt.length - 1];
    return (
        lastChar === "." ||
        lastChar === "?" ||
        lastChar === "!" ||
        lastChar === '"' ||
        lastChar === ":" ||
        lastChar === ")"
    );
}

/**
 * Wait for a condition to be true.
 *
 * @param {Function} conditionFunc         The function that returns the
 *                                         condition.
 * @param {number}   [checkFrequency=100]  The frequency to check the condition.
 * @returns {Promise<undefined>}  A promise that resolves when the condition is
 *     true.
 */
export function waitForCondition(
    conditionFunc: () => boolean,
    checkFrequency = 100
): Promise<undefined> {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (conditionFunc()) {
                clearInterval(interval);
                resolve(undefined);
            }
        }, checkFrequency);
    });
}

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
