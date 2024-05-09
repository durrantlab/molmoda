import { fsApi } from "@/Api/FS";
import { FileInfo } from "./FileInfo";
import { getFileType } from "./FileUtils2";

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
    if (type === undefined || allAcceptableFileTypes.indexOf(type) === -1) {
        return `Error loading "${filename}". Cannot load files of this type.`;
    }
    return undefined;
}

/**
 * Convert a list of File objects to type FileInfo.
 *
 * @param {File[]}  fileList                 The list of files to convert, as
 *                                           loaded through <input>.
 * @param {boolean} isZip                    Whether the files are zip files.
 * @param {string[]} allAcceptableFileTypes  A list of acceptable file types.
 * @returns {Promise<FileInfo | string | undefined>} A promise that resolves to the converted file.
 */
export function filesToFileInfos(
    fileList: File[],
    isZip: boolean,
    allAcceptableFileTypes: string[]
): Promise<(FileInfo | string)[] | undefined> {
    // Type is file extension, uppercase.

    const fileInfoBatchesPromises: Promise<FileInfo[] | string>[] = [];
    for (const file of fileList) {
        const type = getFileType(file.name);
        if (type === undefined) {
            return Promise.resolve(undefined);
        }

        const treatAsZip =
            isZip || type == "MOLMODA" || type == "BIOTITE" || type == "ZIP";

        const fileInfoBatchPromise: Promise<FileInfo[] | string> = new Promise(
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
                    // let fileContentsPromise: Promise<FileInfo[]>;
                    if (!treatAsZip) {
                        fileContents = fileContents.replace(/\r\n/g, "\n");
                        resolve([
                            new FileInfo({
                                name: file.name,
                                // size: file.size,
                                contents: fileContents,
                                // type: type,
                            }),
                        ]);
                    } else {
                        // It's a zip file (or a molmoda file).
                        resolve(fsApi.uncompress(fileContents)); // , "molmoda_file.json");
                    }
                };

                reader.onerror = (e: any) => {
                    reject(e.currentTarget.error.message);
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
        (fileInfoBatches: (FileInfo[] | string)[]) => {
            const flattenedFileInfos: (FileInfo | string)[] = [];
            for (const fileInfoBatch of fileInfoBatches) {
                if (typeof fileInfoBatch === "string") {
                    // An error message. Add without modification.
                    flattenedFileInfos.push(fileInfoBatch);
                } else {
                    for (const fileInfo of fileInfoBatch) {
                        // Special exception for molmoda files...
                        if (
                            ["biotite_file.json", "molmoda_file.json"].indexOf(
                                fileInfo.name
                            ) !== -1
                        ) {
                            fileInfo.name = correctFilenameExt(
                                fileInfo.name,
                                "MOLMODA"
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
