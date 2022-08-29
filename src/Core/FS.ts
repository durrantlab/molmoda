import { dynamicImports } from "./DynamicImports";

export interface ISaveTxt {
    fileName: string;
    content?: string;
    ext?: string;
    compress?: ISaveTxt;
}

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

        return Promise.resolve();
    });

    // const promises: Promise<any>[] = [dynamicImports.fileSaver.module];
    // if (params.compress) {
    //     promises.push(dynamicImports.jsZip.module);
    // }
}

export function saveZipWithTxtFiles(
    zipParams: ISaveTxt,
    files: ISaveTxt[]
): Promise<any> {
    zipParams = _addExt(zipParams, ".zip");
    files = files.map((file) => _addExt(file, ".txt"));

    const promises: Promise<any>[] = [
        dynamicImports.fileSaver.module,
        dynamicImports.jsZip.module,
    ];

    return Promise.all(promises).then((payload) => {
        const fileSaver = payload[0];

        // Compress the output
        const JSZip = payload[1];
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
        zip.generateAsync({ type: "blob" }).then((content: any) => {
            // see FileSaver.js
            fileSaver.saveAs(content, zipParams.fileName);
        });

        return Promise.resolve();
    });
}

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

export function savePngUri(fileName: string, pngUri: string): void {
    dynamicImports.fileSaver.module.then((fileSaver) => {
        const blob = _dataURIToBlob(pngUri);
        fileSaver.saveAs(blob, fileName);
    });
}

export function uncompress(s: string, fileName: string): Promise<string> {
    return dynamicImports.jsZip.module.then((JSZip) => {
        return JSZip.loadAsync(s).then((zip: any) => {
            return zip.file(fileName).async("string");
        });
    });
}
