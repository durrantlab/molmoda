import { getFileNameParts } from "./FilenameManipulation";
import { getFormatInfoGivenType } from "./LoadSaveMolModels/Types/MolFormats";

export interface IFileInfo {
    name: string;
    // size: number;
    contents: any; // string, or obj in some cases
    // type: string; // all caps, extension (e.g., "PDB")
}

/**
 * Given IFileInfo object, returns a string representing the file type,
 * uppercase.
 *
 * @param  {IFileInfo | string} fileInfo  The file to get the type of. Can be of
 *                                        type IFileInfo, or just the filename.
 * @returns {string}  The type of the file, uppercase.
 */
export function getFileType(fileInfo: IFileInfo | string): string {
    // If string provided, turn it into an IFileInfo object.
    if (typeof fileInfo === "string") {
        fileInfo = {
            name: fileInfo,
            contents: "",
        };
    }

    const prts = getFileNameParts(fileInfo.name);

    // TODO: Could also examine contents, but for now just proceed based on
    // extension.

    let ext = prts.ext.toUpperCase();

    // If extension ends in "TXT", get next extension. Because Windows often
    // appends .txt to ends of files.
    if (ext.endsWith(".TXT")) {
        ext = prts.ext.slice(0, -4);
    }

    const possibleTypes = [ext];

    if (prts.ext.indexOf(".") != -1) {
        // Yes, so consider first and last parts of extension. For example, for
        // tmp.pdb, consider both tmp and pdb.
        const extParts = prts.ext.split(".");
        possibleTypes.push(extParts[0].toUpperCase());
        possibleTypes.push(extParts[extParts.length - 1].toUpperCase());
    }

    for (const typ of possibleTypes) {
        const formatInfo = getFormatInfoGivenType(typ);
        if (formatInfo === undefined) {
            // Not found
            continue;
        }

        // It was found.
        return formatInfo.primaryExt.toUpperCase();
    }

    // It's not a molecular filetype. TODO: Will need to implement something
    // separate for other foramts (CSV, etc.).
    console.warn("Could not determine filetype for " + fileInfo.name);
    return ext;
}

/**
 * Given a filename and format type, update the filename so the extension
 * reflects the correct type.
 * 
 * @param  {string} filename The filename to update.
 * @param  {string} type     The type to update to.
 * @returns {string} . The updated filename.
 */
export function correctFilenameExt(filename: string, type: string): string {
    const typeByFilename = getFileType(filename);

    // If the extension is already correct, return the filename
    if (typeByFilename === type.toUpperCase()) {
        return filename;
    }

    // If the extension is not correct, return the filename with the correct
    // extension
    return filename + "." + type.toLowerCase();
}
