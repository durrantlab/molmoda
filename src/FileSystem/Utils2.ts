// To avoid circular dependencies, need to put some functions here instead of
// Utils.ts.

import { getFileNameParts } from "./FilenameManipulation";
import { getFormatInfoGivenType } from "./LoadSaveMolModels/Types/MolFormats";
import { IFileInfo } from "./Types";

type FileInfo = IFileInfo;  // To avoid circular dependencies.

/**
 * Given FileInfo object, returns a string representing the file type,
 * uppercase.
 *
 * @param  {FileInfo | string} fileInfo  The file to get the type of. Can be of
 *                                       type FileInfo, or just the filename.
 * @returns {string}  The type of the file, uppercase.
 */
export function getFileType(fileInfo: FileInfo | string): string {
    // If string provided, turn it into an FileInfo object.
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
        // tmp.pdb, consider both tmp and pdb. But consider last one first (so
        // pdb before tmp).
        const extParts = prts.ext.split(".");
        possibleTypes.push(extParts[extParts.length - 1].toUpperCase());
        possibleTypes.push(extParts[0].toUpperCase());
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
