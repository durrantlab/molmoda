import { IFileParts } from "./Utils";

const regexAcceptableChars = "a-zA-Z\\d."

/**
 * Make sure a filename is valid by removing non-alphanumeric characters.
 *
 * @param  {string} filename The filename to check.
 * @returns {string} The filename with all non-alphanumeric characters removed.
 */
 export function fileNameFilter(filename: string): string {
    // Keep numbers and letters and period. Also - and _.
    // filename = filename.replace(/[^a-zA-Z\d.]/g, "");
    const re = new RegExp(`[^${regexAcceptableChars}]`, "g");
    filename = filename.replace(re, "");
    // filename = filename.replace(/[^\w.-]/g, '');

    return filename;
}

/**
 * Make sure a given filename is acceptable and valid.
 *
 * @param  {string} filename The filename to check.
 * @returns {boolean} Whether the filename is acceptable.
 */
export function matchesFilename(filename: string): boolean {
    // Create regex for any number of letters and numbers and period
    // const r = /^[a-zA-Z\d.]+$/;
    const r = new RegExp(`^[${regexAcceptableChars}]+$`, "g");

    // Return bool whether text matches regex
    return filename.match(r) !== null;
}

/**
 * Get the basename and extension of a filename.
 *
 * @param  {string} filename The filename to get the parts of.
 * @returns {IFileParts} The basename and extension of the filename.
 */
export function getFileNameParts(filename: string): IFileParts {
    if (filename.indexOf(".") === -1) {
        return {
            basename: filename,
            ext: "",
        };
    }

    // Split filename into parts
    const parts = filename.split(".");

    // If subsequent parts are all small, treat them as extensions. So
    // filename.pdb.txt, extension will be pdb.txt.
    let ext = parts.pop();
    while (parts.length > 1 && parts[parts.length - 1].length <= 3) {
        ext = parts.pop() + "." + ext;
    }

    // Return parts
    return {
        basename: parts.join("."),
        ext: ext,
    } as IFileParts;
}