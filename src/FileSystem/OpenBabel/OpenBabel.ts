import { messagesApi } from "@/Api/Messages";
import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
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
 * @param {FileInfo[]} inputFiles      The input files to pass to OpenBabel.
 * @returns {Promise<string | void>}  A promise that resolves to the output of
 *     the program. Void if there is an error?
 */
export function runOpenBabel(args: string[], inputFiles: FileInfo[]): any {
    const worker = new Worker(new URL("./OpenBabel.worker", import.meta.url));

    return runWorker(worker, {
        args,
        inputFiles: inputFiles.map((f) => (f.serialize ? f.serialize() : f)),
    });
}

/**
 * Converts a molecule to another format using OpenBabel.
 *
 * @param  {FileInfo} srcFileInfo   The information about the file to convert.
 * @param  {string}   targetFormat  The target extension.
 * @param  {boolean}  [gen3D]       Whether to assign 3D coordinates.
 * @param  {number}   [pH]          The pH to use for protonation.
 * @returns {Promise<string>}  A promise that resolves to the converted
 *     molecule.
 */
export function convertMolFormatOpenBabel(
    srcFileInfo: FileInfo,
    targetFormat: string,
    gen3D?: boolean,
    pH?: number
): Promise<string[]> {
    const cmds = [srcFileInfo.name, "-m"]; // Note always dividing into multiple files.

    // Get info about the file
    const formatInfo = srcFileInfo.getFormatInfo();

    // If the file required 3D generation, first divide it into separate files.
    // if (
    //     gen3D === true ||
    //     (formatInfo !== undefined && formatInfo.lacks3D === true)
    // ) {

    // }

    if (
        gen3D === true ||
        (formatInfo !== undefined && formatInfo.lacks3D === true)
    ) {
        if (formatInfo !== undefined && formatInfo.lacks3D === true) {
            // Warn user
            messagesApi.popupMessage(
                "Warning",
                "The file does not include 3D coordinates. Currently calculating coordinates, which could take a while. Molecule(s) will appear in the Viewer when ready.",
                PopupVariant.Warning
            );
        }
        cmds.push(...["--gen3D"]);
    }
    if (pH !== undefined) {
        cmds.push(...["-p", pH.toString()]);
    }
    cmds.push(...["-O", "tmp." + targetFormat]);

    return runOpenBabel(cmds, [srcFileInfo])
        .then((convertedFileContents: any) => {
            messagesApi.closePopupMessage();
            return convertedFileContents.outputFiles;
        })
        .catch((err: any) => {
            throw err;
        });
}
