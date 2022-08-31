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
        .replace(/:/g, "-")
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
