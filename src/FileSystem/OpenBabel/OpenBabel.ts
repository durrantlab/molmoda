import { messagesApi } from "@/Api/Messages";
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
 * @param {string[][]}   argsLists               The arguments to pass to
 *                                               OpenBabel. Each set of
 *                                               arguments is a string[], so
 *                                               passing multiple argument sets
 *                                               (e.g., one for each input
 *                                               file), requires string[][].
 * @param {FileInfo[] | IFileInfo[]} inputFiles  The input files to pass to
 *                                               OpenBabel.
 * @returns {Promise<string | void>}  A promise that resolves to the output of
 *     the program. Void if there is an error?
 */
function runOpenBabel(
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

    // Associate an index with each inputFile so you can reorder them after
    // finishing.
    inputFiles.forEach((f, i) => {
        f.auxData = i;
    });

    // Divide the inputFiles between the workers.
    const filesPerWorker = batchify(inputFiles as FileInfo[], nprocs);

    // Similarly divide the arguments among the workers.
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
            const flat = results.flat();

            // Order the output by each items orderIdxs property.
            flat.sort((a, b) => a.orderIdx - b.orderIdx);

            return flat;
        })
        .catch((e: any) => {
            throw e;
        });
}

/**
 * Converts a molecule to another format using OpenBabel.
 *
 * @param  {FileInfo[]}  srcFileInfos   The information about the file to
 *                                      convert.
 * @param  {string}      targetFormat   The target extension.
 * @param  {boolean}     [gen3D]        Whether to assign 3D coordinates.
 * @param  {number}      [pH]           The pH to use for protonation.
 * @returns {Promise<string>}  A promise that resolves to the converted
 *     molecule.
 */
export function convertFileInfosOpenBabel(
    srcFileInfos: FileInfo[],  // Can be multiple-model SDF file, for example.
    targetFormat: string,
    gen3D?: boolean,
    pH?: number,
    // debug?: boolean
): Promise<string[]> {
    // Get info about the file
    // if (debug) {debugger;}
    const formatInfos = srcFileInfos.map(f => f.getFormatInfo());
    const warningNeeded = formatInfos.some(f => f !== undefined && f.lacks3D === true);

    if (warningNeeded) {
        // Warn user
        messagesApi.popupMessage(
            "Warning",
            "One or more input molecules does not include 3D coordinates. Currently calculating coordinates, which could take a while. Molecule(s) will appear in the Viewer when ready.",
            PopupVariant.Warning
        );
    }
    
    // Note that the approach here is to divide the file into multiple files
    // (since one input SDF can have multiple molecules), and then to separate
    // the individual models into grousp to run on separate webworkers. You
    // incur some overhead by shuttling the split file back to main thread only
    // to be redistributed to multiple web workers, but it's the best approach
    // in terms of speed.

    const separateFileCmds = srcFileInfos.map((srcFileInfo, i) => [
        srcFileInfo.name,
        "-m",
        "-O",
        `tmp${i}.${srcFileInfo.getFormatInfo()?.primaryExt}`,
    ]);

    // let tmpPass: any;

    return runOpenBabel(separateFileCmds, srcFileInfos)
        .then((fileContentsFromInputs: any[][]) => {
            // Note that a given input molecule can yield multiple outputs if it
            // contained many molecules (e.g., multi-molecule SDF file)
            
            return fileContentsFromInputs.map((f: any) => f.outputFiles);
        })
        .then((individualMolFiles: string[][]) => {
            // Convert it to a FileInfo
            let fileInfoIdx = -1;
            const nestedFileInfos = individualMolFiles.map((fileContent: string[], i) => {
                return fileContent.map((f: string) => {
                    fileInfoIdx++;
                    return {
                        name: `tmp${fileInfoIdx}.${srcFileInfos[i].getFormatInfo()?.primaryExt}`,
                        contents: f,
                        auxData: formatInfos[i]
                    } as IFileInfo;
                });
            });

            return nestedFileInfos.flat();
        })
        .then((fileInfos: IFileInfo[]) => {
            const cmdsList = fileInfos.map((fileInfo) => {
                const cmds = [fileInfo.name, "-m"]; // Note always dividing into multiple files.

                if (
                    gen3D === true ||
                    (fileInfo.auxData !== undefined && fileInfo.auxData.lacks3D === true)
                ) {
                    cmds.push(...["--gen3D"]);
                }

                if (pH !== undefined) {
                    cmds.push(...["-p", pH.toString()]);
                }
                cmds.push(...["-O", "tmp." + targetFormat]);

                return cmds;
            });

            // tmpPass = [cmdsList, fileInfos.map(f => JSON.parse(JSON.stringify(f)))];
            return runOpenBabel(cmdsList, fileInfos);
        })
        .then((convertedFileContents: any[]): string[] => {
            // The output files are located in the .outputFiles properties.
            // Flatten them into one array.
            const outputFiles = convertedFileContents
                .map((c) => c.outputFiles)
                .flat();

            // debugger;

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
