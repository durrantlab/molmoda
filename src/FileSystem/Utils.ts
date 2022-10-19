import { IFileInfo } from "./Definitions";
import { fsApi } from "@/Api/FS";
import { getType } from "./Utils2";

export interface IFileParts {
    basename: string;
    ext: string;
}

/**
 * Make sure a filename is valid by removing non-alphanumeric characters.
 *
 * @param  {string} filename The filename to check.
 * @returns {string} The filename with all non-alphanumeric characters removed.
 */
export function fileNameFilter(filename: string): string {
    // Keep numbers and letters and period
    filename = filename.replace(/[^a-zA-Z\d.]/g, "");
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
    const r = /^[a-zA-Z\d.]+$/;

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

function checkBadFileType(
    allAcceptableFileTypes: string[],
    type: string,
    filename: string
): string | undefined {
    if (allAcceptableFileTypes.indexOf(type) === -1) {
        return `Error loading "${filename}". Cannot load files of type ${type}.`;
    }
    return undefined;
}

/**
 * Convert a ist of File objects to type IFileInfo.
 *
 * @param {File[]}  fileList                 The list of files to convert, as
 *                                           loaded through <input>.
 * @param {boolean} isZip                    Whether the files are zip files.
 * @param {string[]} allAcceptableFileTypes  A list of acceptable file types.
 * @returns {Promise<IFileInfo>} A promise that resolves to the converted file.
 */
export function filesToFileInfos(
    fileList: File[],
    isZip: boolean,
    allAcceptableFileTypes: string[]
): Promise<(IFileInfo | string)[]> {
    // Type is file extension, uppercase.

    const fileInfoBatchesPromises: Promise<IFileInfo[] | string>[] = [];
    for (const file of fileList) {
        const type = getType(file.name);
        const treatAsZip = isZip || type == "BIOTITE" || type == "ZIP";

        const fileInfoBatchPromise: Promise<IFileInfo[] | string> = new Promise(
            (resolve, reject) => {
                const reader = new FileReader();

                reader.onload = (e: ProgressEvent) => {
                    // If it's not an acceptable file type, abort effort.
                    const err = checkBadFileType(
                        allAcceptableFileTypes,
                        type,
                        file.name
                    );
                    if (err) {
                        resolve(err);
                        return;
                    }

                    const fileReader = e.target as FileReader;
                    let fileContents = fileReader.result as string;
                    // let fileContentsPromise: Promise<IFileInfo[]>;
                    if (!treatAsZip) {
                        fileContents = fileContents.replace(/\r\n/g, "\n");
                        resolve([
                            {
                                name: file.name,
                                size: file.size,
                                contents: fileContents,
                                type: type,
                            } as IFileInfo,
                        ]);
                    } else {
                        // It's a zip file (or a biotite file).
                        resolve(fsApi.uncompress(fileContents)); // , "biotite_file.json");
                    }

                    // fileContentsPromise
                    //     .then((fileContents: string[]) => {
                    //         debugger
                    //         resolve({
                    //             name: file.name,
                    //             size: file.size,
                    //             contents: fileContents[0],
                    //             type: type,
                    //         } as IFileInfo);
                    //         return;
                    //     })
                    //     .catch((err: any) => {
                    //         console.log(err);
                    //     });
                };

                reader.onerror = (e: any) => {
                    reject(e);
                };

                if (!treatAsZip) {
                    reader.readAsText(file);
                } else {
                    // It's a zip file.
                    reader.readAsBinaryString(file);
                }
            }
        );
        fileInfoBatchesPromises.push(fileInfoBatchPromise);
    }

    // Flatten the array of arrays of files into a single array of files.
    return Promise.all(fileInfoBatchesPromises).then(
        (fileInfoBatches: (IFileInfo[] | string)[]) => {
            const flattenedFileInfos: (IFileInfo | string)[] = [];
            for (const fileInfoBatch of fileInfoBatches) {
                if (typeof fileInfoBatch === "string") {
                    // An error message. Add without modification.
                    flattenedFileInfos.push(fileInfoBatch);
                } else {
                    for (const fileInfo of fileInfoBatch) {
                        // Special exception for biotite files...
                        if (fileInfo.name === "biotite_file.json") {
                            fileInfo.type = "BIOTITE";
                            flattenedFileInfos.push(fileInfo);
                            continue;
                        }

                        // If it's not an acceptable file type, abort effort.
                        const err = checkBadFileType(
                            allAcceptableFileTypes,
                            fileInfo.type,
                            fileInfo.name
                        );
                        if (err) {
                            flattenedFileInfos.push(err);
                        } else {
                            flattenedFileInfos.push(fileInfo);
                        }
                    }
                }
            }
            return flattenedFileInfos;
        }
    );
}
