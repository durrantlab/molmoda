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
 * Capitalizes the first letter of a string.
 *
 * @param  {string} s The string to capitalize.
 * @returns {string} The capitalized string.
 */
export function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function capitalizeEachWork(s: string): string {
    const wrds = s.split(" ").map(wrd => capitalize(wrd));
    return wrds.join(" ");
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

