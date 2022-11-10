import { IFileInfo } from "@/FileSystem/Types";
import { dynamicImports } from "./DynamicImports";

export interface ISaveTxt {
    fileName: string;
    content?: string;
    ext?: string;
    compress?: ISaveTxt;
}

/**
 * Adds an extension if missing.
 *
 * @param  {ISaveTxt} params   The parameters describing the text file.
 * @param  {string} defaultExt The default extension to use.
 * @returns {ISaveTxt} The parameters with the extension added to the filename
 *     field.
 */
function _addExt(params: ISaveTxt, defaultExt: string): ISaveTxt {
    // Set some default values.
    params.ext = params.ext || defaultExt;
    // params.compress = params.compress || false;

    // If ext doesn't start with a period, add one.
    if (params.ext.charAt(0) !== ".") {
        params.ext = "." + params.ext;
    }

    // If fileName doesn't end in the string contained in params.ext (case
    // insensitive), add it. Use endsWith
    if (!params.fileName.toLowerCase().endsWith(params.ext.toLowerCase())) {
        params.fileName += params.ext;
    }

    return params;
}

/**
 * Saves a text file.
 *
 * @param  {ISaveTxt} params The parameters describing the text file.
 * @returns {Promise<any>} A promise that resolves after saving the file.
 */
export function saveTxt(params: ISaveTxt): Promise<any> {
    params = _addExt(params, ".txt");
    if (params.compress) {
        params.compress = _addExt(params.compress, ".zip");
    }

    if (params.compress) {
        return saveZipWithTxtFiles(params.compress, [params]);
    }

    // Don't compress the output
    return dynamicImports.fileSaver.module.then((fileSaver: any) => {
        const blob = new Blob([params.content as string], {
            type: "text/plain;charset=utf-8",
        });
        fileSaver.saveAs(blob, params.fileName);
        return;
    });

    // const promises: Promise<any>[] = [dynamicImports.fileSaver.module];
    // if (params.compress) {
    //     promises.push(dynamicImports.jsZip.module);
    // }
}

/**
 * Saves a zip file containing one or more text files.
 *
 * @param  {ISaveTxt} zipParams The parameters describing the zip file.
 * @param  {ISaveTxt[]} files   A list of parameters describing the text files
 *                              to add to the zip file.
 * @returns {Promise<any>} A promise that resolves after saving the zip file.
 */
export function saveZipWithTxtFiles(
    zipParams: ISaveTxt,
    files: ISaveTxt[]
): Promise<any> {
    zipParams = _addExt(zipParams, ".zip");
    files = files.map((file) => _addExt(file, ".txt"));

    const makeZipPromise = dynamicImports.jsZip.module.then((JSZip: any) => {
        // Compress the output
        const zip = new JSZip();
        files.forEach((file) => {
            zip.file(file.fileName, file.content, {
                compression: "DEFLATE",
                // Note: Below doesn't seem to improve compression, so
                // comment out.
                // compressionOptions: {
                //     compressionOptions: 9
                // }
            });
        });
        return zip.generateAsync({ type: "blob" });
    });

    const promises: Promise<any>[] = [
        dynamicImports.fileSaver.module,
        makeZipPromise,
    ];

    return Promise.all(promises).then((payload: any[]) => {
        const fileSaver = payload[0];
        const zipBlob = payload[1];
        fileSaver.saveAs(zipBlob, zipParams.fileName);
        return;
    });
}

/**
 * Converts a dataURI to a Blob.
 *
 * @param  {string} dataURI The dataURI to convert.
 * @returns {Blob} The Blob representing the dataURI.
 */
function _dataURIToBlob(dataURI: string): Blob {
    // see https://stackoverflow.com/questions/12168909/blob-from-dataurl

    // convert base64 to raw binary data held in a string doesn't handle
    // URLEncoded DataURIs - see SO answer #6850276 for code that does this
    const byteString = atob(dataURI.split(",")[1]);

    // separate out the mime component
    const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

    // write the bytes of the string to an ArrayBuffer
    const ab = new ArrayBuffer(byteString.length);

    // create a view into the buffer
    const ia = new Uint8Array(ab);

    // set the bytes of the buffer to the correct values
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    return new Blob([ab], { type: mimeString });
}

/**
 * Saves a dataURI representing a PNG image to a file.
 *
 * @param  {string} fileName The name of the file to save.
 * @param  {string} pngUri   The dataURI representing the PNG image.
 */
export function savePngUri(fileName: string, pngUri: string) {
    dynamicImports.fileSaver.module
        .then((fileSaver) => {
            const blob = _dataURIToBlob(pngUri);
            fileSaver.saveAs(blob, fileName);
            return;
        })
        .catch((err: any) => {
            console.error(err);
        });
}

/**
 * Given a string of compressed data (representing a zip file), get the contents
 * of a text file in it.
 *
 * @param  {string} s          The compressed data.
 * @returns {Promise<string[]>} A promise that resolves to the contents of the
 *     file(s). Always an array, even if only one file is returned.
 */
export function uncompress(s: string): Promise<IFileInfo[]> {
    const getZipObjPromise = dynamicImports.jsZip.module.then((JSZip) => {
        return JSZip.loadAsync(s);
    });

    // if (fileName !== undefined) {
    //     return getZipObjPromise.then((zip: any) => {
    //         return [zip.file(fileName).async("string")];
    //     });
    // } else {
    let fileNames: string[];
    // let fileSizes: number[];
    return getZipObjPromise
        .then((zip: any) => {
            fileNames = Object.keys(zip.files);
            // fileSizes = zip.files.map((file: any) => file.size);
            // debugger
            const promises = fileNames.map((f) => zip.files[f].async("string"));
            return Promise.all(promises);
        })
        .then((fileContents: string[]) => {
            const fileInfos: IFileInfo[] = [];
            for (let i = 0; i < fileNames.length; i++) {
                const fileName = fileNames[i];
                if (fileName.startsWith("__MACOSX")) {
                    continue;
                }
                if (fileName.startsWith(".")) {
                    continue;
                }

                const contents = fileContents[i];

                fileInfos.push({
                    name: fileName.split("/").pop(),  // basename
                    // Getting file size not supported with zip. You could
                    // implement, though.
                    // size: 0,  
                    contents: contents,
                    // type: type,
                } as IFileInfo);
            }
            return fileInfos;
        });
    // }
}
