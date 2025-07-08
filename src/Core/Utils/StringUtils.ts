import memoize from "lodash.memoize";

/**
 * Given text, create a text slug.
 *
 * @param  {string}  text             The text to slugify.
 * @param  {boolean} [lowerCase=true] Whether to lowercase the slug.
 * @returns {string} The slugified text.
 */
export const slugify = memoize(
    function (text: string, lowerCase = true): string {
        if (lowerCase) {
            text = text.toLowerCase();
        }
        return text
            .trim()
            .replace(/[:.]/g, "-")
            .replace(/[^\w -]+/g, "")
            .replace(/\s+/g, "-");
    },
    (...args) => JSON.stringify(args)
);

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
 * Lowercases the first letter of a string.
 *
 * @param  {string} s The string to lowerize.
 * @returns {string} The lowerized string.
 */
export function lowerize(s: string): string {
    return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Capitalizes the first letter of each word in a string.
 *
 * @param  {string} s The string to capitalize.
 * @returns {string} The capitalized string.
 */
export const capitalizeEachWord = memoize(function (s: string): string {
    if (!s) {
        return "";
    }
    const wrds = s
        .trim()
        .split(/\s+/)
        .map((wrd) => capitalize(wrd));
    return wrds.join(" ");
});

/**
 * A set of short English words that are typically not capitalized in a title,
 * unless they are the first or last word.
 *
 * @private
 */
const _shortWords = new Set([
    "a",
    "an",
    "the",
    "and",
    "but",
    "or",
    "for",
    "nor",
    "on",
    "at",
    "to",
    "from",
    "by",
    "with",
    "in",
    "of",
    "over",
    "under",
    "not",
]);

/**
 * Converts a string to title case, capitalizing the first letter of each word
 * except for short words (articles, prepositions, conjunctions) which are not
 * the first or last word.
 *
 * @param {string} s The string to convert.
 * @returns {string} The title-cased string.
 */
export const toTitleCase = memoize(function (s: string): string {
    if (!s) {
        return "";
    }
    const words = s.trim().split(/\s+/);
    const titleCasedWords = words.map((word, index) => {
        const lowerWord = word.toLowerCase();
        if (
            index === 0 ||
            index === words.length - 1 ||
            !_shortWords.has(lowerWord)
        ) {
            return capitalize(word);
        }
        return lowerWord;
    });
    return titleCasedWords.join(" ");
});

/**
 * Checks if a word contains a capital letter at an index greater than 0.
 *
 * @param {string} word The word to check.
 * @returns {boolean} True if the word has an internal capital letter.
 * @private
 */
function _hasInternalCapital(word: string): boolean {
    if (word.length < 2) {
        return false;
    }
    // Check characters from the second one onwards
    for (let i = 1; i < word.length; i++) {
        const char = word[i];
        // If the character is a letter and is uppercase
        if (char >= "A" && char <= "Z") {
            return true;
        }
    }
    return false;
}

/**
 * Converts a string to sentence case. Capitalizes the first word and
 * lowercases all other words, unless those other words have internal capital
 * letters (e.g., "PubChem").
 *
 * @param {string} s The string to convert.
 * @returns {string} The sentence-cased string.
 */
export const toSentenceCase = memoize(function (s: string): string {
    if (!s) {
        return "";
    }
    const trimmed = s.trim();
    if (trimmed.length === 0) {
        return "";
    }
    const words = trimmed.split(/\s+/);
    const firstWord = capitalize(words[0]);
    const otherWords = words.slice(1).map((word) => {
        return _hasInternalCapital(word) ? word : word.toLowerCase();
    });
    return [firstWord, ...otherWords].join(" ");
});

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

/**
 * Generic natural sort function that can work with various data types and uses
 * a key accessor function to extract the string to sort on.
 *
 * @param {any}      a             First item to compare.
 * @param {any}      b             Second item to compare.
 * @param {Function} [keyAccessor] Optional function to extract the string to
 *                                 sort on (defaults to identity function).
 * @returns {number} -1 if a < b, 0 if a === b, 1 if a > b.
 */
export function naturalSort<T>(
    a: T,
    b: T,
    keyAccessor: (item: T) => string = (item) => String(item)
): number {
    // Helper function to split a string into an array of text and number chunks
    const splitIntoChunks = (str: string): (string | number)[] => {
        // Use regex to match text and number sequences
        const matches = str.match(/(\d+|\D+)/g) || [];

        // Convert number chunks to actual numbers
        return matches.map((chunk) => {
            const numVal = Number(chunk);
            return isNaN(numVal) ? chunk : numVal;
        });
    };

    // Extract strings to compare using the keyAccessor
    const strA = keyAccessor(a);
    const strB = keyAccessor(b);

    const chunksA = splitIntoChunks(strA);
    const chunksB = splitIntoChunks(strB);

    // Compare each chunk
    const minLength = Math.min(chunksA.length, chunksB.length);

    for (let i = 0; i < minLength; i++) {
        const chunkA = chunksA[i];
        const chunkB = chunksB[i];

        // If both chunks are of the same type
        if (typeof chunkA === typeof chunkB) {
            // Compare numbers numerically
            if (typeof chunkA === "number" && typeof chunkB === "number") {
                if (chunkA !== chunkB) {
                    return chunkA - chunkB;
                }
            }
            // Compare strings lexicographically
            else if (chunkA !== chunkB) {
                return String(chunkA) < String(chunkB) ? -1 : 1;
            }
        }
        // Different types - numbers come before strings
        else {
            return typeof chunkA === "number" ? -1 : 1;
        }
    }

    // If we get here, all comparable chunks are equal
    // So the shorter one comes first
    return chunksA.length - chunksB.length;
}

/**
 * Creates a sorting function for use with Array.sort() that applies natural
 * sorting.
 *
 * @param {Function} [keyAccessor]  Optional function to extract the string to
 *                                  sort on.
 * @returns {Function} A sorting function that can be passed to Array.sort().
 */
export function createNaturalSortFunc<T>(
    keyAccessor?: (item: T) => string
): (a: T, b: T) => number {
    return (a: T, b: T) => naturalSort(a, b, keyAccessor);
}
