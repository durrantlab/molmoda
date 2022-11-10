import { correctFilenameExt, getFileType, IFileInfo } from "./Types";
import { fsApi } from "@/Api/FS";

export interface IFileParts {
    basename: string;
    ext: string;
}



/**
 * Checks if a given file type is acceptable.
 *
 * @param  {string[]} allAcceptableFileTypes  The file types to check against.
 * @param  {string}   filename                The filename to check.
 * @returns {string | undefined}  An error message if the file type is not
 *     acceptable. If acceptable, undefined.
 */
function checkBadFileType(
    allAcceptableFileTypes: string[],
    // type: string,
    filename: string
): string | undefined {
    const type = getFileType(filename);
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
        const type = getFileType(file.name);
        const treatAsZip = isZip || type == "BIOTITE" || type == "ZIP";

        const fileInfoBatchPromise: Promise<IFileInfo[] | string> = new Promise(
            (resolve, reject) => {
                const reader = new FileReader();

                reader.onload = (e: ProgressEvent) => {
                    // If it's not an acceptable file type, abort effort.
                    const err = checkBadFileType(
                        allAcceptableFileTypes,
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
                                // size: file.size,
                                contents: fileContents,
                                // type: type,
                            } as IFileInfo,
                        ]);
                    } else {
                        // It's a zip file (or a biotite file).
                        resolve(fsApi.uncompress(fileContents)); // , "biotite_file.json");
                    }
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
                            fileInfo.name = correctFilenameExt(
                                fileInfo.name,
                                "BIOTITE"
                            );
                            flattenedFileInfos.push(fileInfo);
                            continue;
                        }

                        // If it's not an acceptable file type, abort effort.
                        const err = checkBadFileType(
                            allAcceptableFileTypes,
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
