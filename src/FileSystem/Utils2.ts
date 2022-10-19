// Putting some functions here to prevent circular dependencies. I feel like
// there must be a better way to do this....

/**
 * Given a filename, determine the type.
 *
 * @param {string} filename  The filename to determine the type of.
 * @returns {string} The type of the file.
 */
 export function getType(filename: string): string {
    // Type is file extension, uppercase.
    const filePrts = filename.split(".");
    let type = filePrts.pop()?.toUpperCase() as string;

    // If extension is TXT, get next extension. Because Windows often
    // appends .txt to ends of files.
    if (type === "TXT") {
        type = filePrts.pop()?.toUpperCase() as string;
    }

    return type;
}
