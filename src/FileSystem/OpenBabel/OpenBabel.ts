import { messagesApi } from "@/Api/Messages";
import { randomID } from "@/Core/Utils";
import { batchify } from "@/Core/Utils2";
import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import type { FileInfo } from "../FileInfo";
import { IFileInfo } from "../Types";

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

const openBabelWorkers: Worker[] = [];

/**
 *
 * @param {string[][]}   argsLists    The arguments to pass to OpenBabel. Each
 *                                    set of arguments is a string[], so passing
 *                                    multiple argument sets (e.g., one for each
 *                                    input file), requires string[][].
 * @param {FileInfo[]} inputFiles     The input files to pass to OpenBabel.
 * @returns {Promise<string | void>}  A promise that resolves to the output of
 *     the program. Void if there is an error?
 */
export function runOpenBabel(
    argsLists: string[][],
    inputFiles: FileInfo[] | IFileInfo[]
): any {
    // Get the number of open babel workers that should be running.
    const nprocs = getSetting("maxProcs");

    // Termiante and remove workers that are no longer needed.
    while (openBabelWorkers.length > nprocs) {
        const worker = openBabelWorkers.pop();
        if (worker) {
            worker.terminate();
        }
    }

    // Create new workers if needed.
    while (openBabelWorkers.length < nprocs) {
        const worker = new Worker(
            new URL("./OpenBabel.worker", import.meta.url)
        );
        openBabelWorkers.push(worker);
    }

    // Divide the inputFiles between the workers.
    const filesPerWorker = batchify(inputFiles, nprocs);

    // Similarly divide the arguments amoung the workers.
    const argsPerWorker = batchify(argsLists, nprocs);

    const promises: Promise<any>[] = [];

    for (let i = 0; i < filesPerWorker.length; i++) {
        const args = argsPerWorker[i];
        const inpFiles = filesPerWorker[i];
        const wrker = openBabelWorkers[i];
        promises.push(
            runWorker(
                wrker,
                {
                    argsSets: args,
                    inputFiles: inpFiles.map((f) =>
                        (f as FileInfo).serialize
                            ? (f as FileInfo).serialize()
                            : f
                    ),
                },
                false // don't auto terminate the worker.
            )
        );
    }

    return Promise.all(promises)
        .then((results: any[][]) => {
            // Flatten the results.
            return results.flat();
        })
        .catch((e: any) => {
            throw e;
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
    // Get info about the file
    const formatInfo = srcFileInfo.getFormatInfo();

    if (formatInfo !== undefined && formatInfo.lacks3D === true) {
        // Warn user
        messagesApi.popupMessage(
            "Warning",
            "The file does not include 3D coordinates. Currently calculating coordinates, which could take a while. Molecule(s) will appear in the Viewer when ready.",
            PopupVariant.Warning
        );
    }

    // If the file required 3D generation, first divide it into separate files.
    // if (
    //     gen3D === true ||
    //     (formatInfo !== undefined && formatInfo.lacks3D === true)
    // ) {

    // }

    // Always divide into separate files.
    const separateFileCmds = [
        srcFileInfo.name,
        "-m",
        "-O",
        "tmp." + srcFileInfo.getFormatInfo()?.primaryExt,
    ];
    return runOpenBabel([separateFileCmds], [srcFileInfo])
        .then((convertedFileContents: any[]) => {
            // You've only run one command, so there's only one item in the
            // array.
            return convertedFileContents[0].outputFiles;
        })
        .then((outputFileContents: string[]) => {
            // Convert it to a FileInfo
            return outputFileContents.map((fileContent, i) => {
                return {
                    name: `tmp${i}.${srcFileInfo.getFormatInfo()?.primaryExt}`,
                    contents: fileContent,
                } as IFileInfo;
            });
        })
        .then((outputFileInfos: IFileInfo[]) => {
            const cmdsList = outputFileInfos.map((outputFileInfo) => {
                const cmds = [outputFileInfo.name, "-m"]; // Note always dividing into multiple files.

                if (
                    gen3D === true ||
                    (formatInfo !== undefined && formatInfo.lacks3D === true)
                ) {
                    cmds.push(...["--gen3D"]);
                }
                if (pH !== undefined) {
                    cmds.push(...["-p", pH.toString()]);
                }
                cmds.push(...["-O", "tmp." + targetFormat]);

                return cmds;
            });
            return runOpenBabel(cmdsList, outputFileInfos);
        })
        .then((convertedFileContents: any[]): string[] => {
            // The output files are located in the .outputFiles properties.
            // Flatten them into one array.
            const outputFiles = convertedFileContents
                .map((c) => c.outputFiles)
                .flat();

            // TODO: Report what's in the .stdOutAndErr property? Not sure needed.

            messagesApi.closePopupMessage();
            return outputFiles;
        })
        .catch((err: any) => {
            throw err;
        });

    // return runOpenBabel(cmds, [srcFileInfo])
    //     .then((convertedFileContents: any) => {
    //         messagesApi.closePopupMessage();
    //         return convertedFileContents.outputFiles;
    //     })
    //     .catch((err: any) => {
    //         throw err;
    //     });
}
