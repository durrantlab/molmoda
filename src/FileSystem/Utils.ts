export interface IFileParts {
    basename: string;
    ext: string;
}

export function fileNameFilter(filename: string): string {
    // Keep only numbers and letters and period
    filename = filename.replace(/[^a-zA-Z0-9.]/g, "");
    return filename;
}

export function matchesFilename(filename: string): boolean {
    // Create regex for any number of letters and numbers and period
    const r = /^[a-zA-Z0-9.]+$/;

    // Return bool whether text matches regex
    return filename.match(r) !== null;
}

export function getFileNameParts(filename: string): IFileParts {
    // Split filename into parts
    const parts = filename.split(".");

    let ext = parts.pop();
    while (parts[parts.length - 1].length <= 3) {
        ext = parts.pop() + "." + ext;
    }

    // Return parts
    return {
        basename: parts.join("."),
        ext: ext,
    } as IFileParts;
}