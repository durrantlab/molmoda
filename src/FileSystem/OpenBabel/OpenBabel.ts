import { dynamicImports } from "@/Core/DynamicImports";
import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { FileInfo } from "../FileInfo";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// import OpenBabel from "@/libs/ToCopy/obabel-wasm/obabel";
// import { initOpenBabel } from "@/libs/ToCopy/obabel-wasm/obabel";

// export let BFS: any = undefined;

// function getFSPromise(): Promise<any> {
//     let fsPromise: Promise<any>;

//     // Load BFS
//     if (BFS === undefined) {
//         fsPromise = dynamicImports.browserfs.module.then((browserfs: any) => {
//             // fsPromise = dynamicImports.memfs.module.then((browserfs: any) => {
//             //browserfs.initialize(new browserfs.FileSystem.InMemory());
//             browserfs.configure({ fs: "InMemory" }, (e: any) => {
//                 if (e) {
//                     throw e;
//                 }
//             });
//             BFS = new browserfs.EmscriptenFS() as any;
//             // debugger;
//             //FS.createFolder(FS.root, 'data', true, true);

//             //FS.mount(FS, {root: '/'}, '/data');
//             debugger;
//             return BFS;
//         });
//     } else {
//         fsPromise = Promise.resolve(BFS);
//     }
//     return fsPromise;
// }

/**
 *
 * @param {string[]}   args            The arguments to pass to OpenBabel.
 * @param {Function} [onBeforeRun]  Function to run before running OpenBabel.
 *                                     Good for creating files. Optional.
 * @param {Function} [onAfterRun]   Function to run after running OpenBabel.
 *                                     Good for reading files. Optional.
 * @returns {Promise<string | void>}  A promise that resolves to the output of
 *     the program. Void if there is an error?
 */
export function runOpenBabel(
    args: string[],
    inputFiles: FileInfo[],
    outputFilePath: string
): any {
    const worker = new Worker(new URL("./OpenBabel.worker", import.meta.url));

    return runWorker(worker, {
        args,
        inputFiles,
        outputFilePath,
    });
}

/**
 * Converts a molecule to another format using OpenBabel.
 *
 * @param  {FileInfo} srcFileInfo  The information about the file to convert.
 * @param  {string} targetFormat    The target extension.
 * @returns {Promise<string>}  A promise that resolves to the converted
 *     molecule.
 */
export function convertMolFormatOpenBabel(
    srcFileInfo: FileInfo,
    targetFormat: string
): Promise<string> {
    return runOpenBabel(
        [srcFileInfo.name, "-O", "tmp." + targetFormat],
        [srcFileInfo],
        "tmp." + targetFormat
    )
        .then((res: any) => {
            return res.outputFile;
        })
        .catch((err: any) => {
            throw err;
        });
}
