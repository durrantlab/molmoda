import { messagesApi } from "@/Api/Messages";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import type { FileInfo } from "../FileInfo";
import { IFileInfo } from "../Types";
import { getFormatInfoGivenType } from "../LoadSaveMolModels/Types/MolFormats";
import { OpenBabelQueue } from "./OpenBabelQueue";

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
    appId: string,
    argsLists: string[][],
    inputFiles: FileInfo[] | IFileInfo[]
): any {
    // Quick validation to make sure argsLists is in right format.
    if (argsLists.length > 0 && !Array.isArray(argsLists[0])) {
        throw new Error("argsLists must be an array of arrays.");
    }

    // Associate an index with each inputFile so you can reorder them after
    // finishing.
    inputFiles.forEach((f, i) => {
        f.auxData = i;
    });

    inputFiles = inputFiles.map((f) =>
        (f as FileInfo).serialize ? (f as FileInfo).serialize() : f
    );

    // Construct payloads by "zipping" the inputFiles and argsLists together.
    const payloads: any[] = [];
    for (let i = 0; i < inputFiles.length; i++) {
        payloads.push({
            args: argsLists[i],
            inputFile: inputFiles[i],
        });
    }

    return new Promise((resolve, reject) => {
        // Batching 25 at a time. This was chosen arbitrarily.
        return new OpenBabelQueue(appId, payloads, undefined, 1, 25, {
            // onJobDone: (jobInfo) => {},
            // onProgress: (progress) => {},
            onQueueDone: (outputs) => {
                console.log("Queue done:", outputs);
                resolve(outputs);
            },
            // onError(jobInfos, error) {},
        });
    });

    // return openBabelWorkerPool.runJobs(payloads, nprocs)
    //     .then((results: any) => {
    //         // Reorder the results based on the auxData field.
    //         results.sort((a: any, b: any) => a.auxData - b.auxData);
    //         return results;
    //     });
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
    srcFileInfos: FileInfo[], // Can be multiple-model SDF file, for example.
    targetFormat: string,
    gen3D?: boolean,
    pH?: number
    // debug?: boolean
): Promise<string[]> {
    // Get info about the file
    // if (debug) {debugger;}
    const formatInfos = srcFileInfos.map((f) => f.getFormatInfo());
    const warningNeeded = formatInfos.some(
        (f) => f !== undefined && f.lacks3D === true
    );

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

    return runOpenBabel("splitFile", separateFileCmds, srcFileInfos)
        .then((fileContentsFromInputs: any[][]) => {
            // Note that a given input molecule can yield multiple outputs if it
            // contained many molecules (e.g., multi-molecule SDF file)

            return fileContentsFromInputs.map((f: any) => f.outputFiles);
        })
        .then((individualMolFiles: string[][]) => {
            // Convert it to a FileInfo
            let fileInfoIdx = -1;
            const nestedFileInfos = individualMolFiles.map(
                (fileContent: string[], i) => {
                    return fileContent.map((f: string) => {
                        fileInfoIdx++;
                        return {
                            name: `tmp${fileInfoIdx}.${
                                srcFileInfos[i].getFormatInfo()?.primaryExt
                            }`,
                            contents: f,
                            auxData: formatInfos[i],
                        } as IFileInfo;
                    });
                }
            );

            return nestedFileInfos.flat();
        })
        .then((fileInfos: IFileInfo[]) => {
            const cmdsList = fileInfos.map((fileInfo) => {
                const cmds = [fileInfo.name, "-m"]; // Note always dividing into multiple files.

                if (
                    gen3D === true ||
                    (fileInfo.auxData !== undefined &&
                        fileInfo.auxData.lacks3D === true)
                ) {
                    cmds.push(...["--gen3D"]);
                }

                if (pH !== undefined) {
                    cmds.push(...["-p", pH.toString()]);
                }

                // Are there additional arguments to pass to OpenBabel?
                const formatInfo = getFormatInfoGivenType(targetFormat);

                const extToUse = formatInfo?.obabelFormatName ?? targetFormat;
                cmds.push(...["-O", "tmp." + extToUse]);

                if (formatInfo?.extraObabelArgs !== undefined) {
                    cmds.push(...formatInfo.extraObabelArgs);
                }

                return cmds;
            });

            // tmpPass = [cmdsList, fileInfos.map(f => JSON.parse(JSON.stringify(f)))];
            return runOpenBabel("convert", cmdsList, fileInfos);
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
