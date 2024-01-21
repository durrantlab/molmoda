import { messagesApi } from "@/Api/Messages";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import type { FileInfo } from "../FileInfo";
import { IFileInfo } from "../Types";
import {
    IFormatInfo,
    getFormatInfoGivenType,
} from "../LoadSaveMolModels/Types/MolFormats";
import { OpenBabelQueue } from "./OpenBabelQueue";

/**
 * Runs OpenBabel.
 *
 * @param {string}       appId                   The app ID.
 * @param {string[][]}  argsLists                The arguments to pass to
 *                                               OpenBabel. Each set of
 *                                               arguments is a string[], so
 *                                               passing multiple argument sets
 *                                               (e.g., one for each input
 *                                               file), requires string[][].
 * @param {FileInfo[] | IFileInfo[]} inputFiles  The input files to pass to
 *                                               OpenBabel.
 * @returns {Promise<any>}  A promise that resolves to the output of the
 *     program. Void if there is an error?
 */
function runOpenBabel(
    appId: string,
    argsLists: string[][],
    inputFiles: FileInfo[] | IFileInfo[]
): Promise<any> {
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

    return new OpenBabelQueue(appId, payloads).done;
}

/**
 * Consider whether a warning is needed about lack of 3D coordinates. If needed,
 * show the warning.
 *
 * @param {IFormatInfo[]} formatInfos  The format infos.
 * @returns {any}  A timer that can be used to clear the warning if needed.
 */
function considerThreeDNeededWarning(
    formatInfos: (IFormatInfo | undefined)[]
): any {
    const warningNeeded = formatInfos.some(
        (f) => f !== undefined && f.lacks3D === true
    );

    let msgTimer = undefined
    if (warningNeeded) {
        msgTimer = setTimeout(() => {
            // Warn user
            messagesApi.popupMessage(
                "Warning",
                "One or more input molecules does not include 3D coordinates. Currently calculating coordinates, which could take a while. Molecule(s) will appear in the Viewer when ready.",
                PopupVariant.Warning
            );
        }, 2000);
    }

    return msgTimer;
}

/**
 * Separates a file into multiple files, one for each molecule.
 *
 * @param  {FileInfo[]}    srcFileInfos  The source file info.
 * @param  {IFormatInfo[]} formatInfos   The format infos.
 * @returns {Promise<FileInfo[]>}  A promise that resolves to the separated
 *    files.
 */
async function separateFiles(
    srcFileInfos: FileInfo[],
    formatInfos: (IFormatInfo | undefined)[]
): Promise<FileInfo[]> {
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

    const fileContentsFromInputs = await runOpenBabel(
        "convertPrep",
        separateFileCmds,
        srcFileInfos
    );

    // Note that a given input molecule can yield multiple outputs if it
    // contained many molecules (e.g., multi-molecule SDF file)
    const individualMolFiles = fileContentsFromInputs.map(
        (f: any) => f.outputFiles
    );

    // Convert them to a FileInfo
    let fileInfoIdx = -1;
    return individualMolFiles
        .map((fileContent: string[], i: any) => {
            return fileContent.map((f: string) => {
                fileInfoIdx++;
                const ext = srcFileInfos[i].getFormatInfo()?.primaryExt;
                return {
                    name: `tmp${fileInfoIdx}.${ext}`,
                    contents: f,
                    auxData: formatInfos[i],
                } as IFileInfo;
            });
        })
        .flat();
}

/**
 * Converts molecules to another format using OpenBabel.
 *
 * @param  {FileInfo[]}  fileInfos     The information about the file to
 *                                     convert.
 * @param  {string}      targetFormat  The target extension.
 * @param  {boolean}     [gen3D]       Whether to assign 3D coordinates.
 * @param  {number}      [pH]          The pH to use for protonation.
 * @returns {Promise<string[]>}  A promise that resolves to the converted
 *    molecules.
 */
async function convertToNewFormat(
    fileInfos: FileInfo[],
    targetFormat: string,
    gen3D?: boolean,
    pH?: number
): Promise<string[]> {
    const cmdsList = fileInfos.map((fileInfo: FileInfo) => {
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
        cmds.push(...["-O", "tmpout." + extToUse]);

        if (formatInfo?.extraObabelArgs !== undefined) {
            cmds.push(...formatInfo.extraObabelArgs);
        }

        return cmds;
    });

    // tmpPass = [cmdsList, fileInfos.map(f => JSON.parse(JSON.stringify(f)))];
    const convertedFileContents = await runOpenBabel(
        "convert",
        cmdsList,
        fileInfos
    );

    // The output files are located in the .outputFiles properties.
    // Flatten them into one array.
    return convertedFileContents.map((c: any) => c.outputFiles).flat();
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
export async function convertFileInfosOpenBabel(
    srcFileInfos: FileInfo[], // Can be multiple-model SDF file, for example.
    targetFormat: string,
    gen3D?: boolean,
    pH?: number
    // debug?: boolean
): Promise<string[]> {
    // Get info about the file
    // if (debug) {debugger;}
    const formatInfos = srcFileInfos.map((f) => f.getFormatInfo());

    const msgTimer = considerThreeDNeededWarning(formatInfos);

    const fileInfos = await separateFiles(srcFileInfos, formatInfos);

    const outputFiles = await convertToNewFormat(
        fileInfos,
        targetFormat,
        gen3D,
        pH
    );

    // debugger;

    // TODO: Report what's in the .stdOutAndErr property? Not sure needed.

    if (msgTimer !== undefined) {
        clearTimeout(msgTimer);
        // messagesApi.closePopupMessage();
    }
    return outputFiles;

    // .catch((err: any) => {
    //     throw err;
    // });

    // return runOpenBabel(cmds, [srcFileInfo])
    //     .then((convertedFileContents: any) => {
    //         messagesApi.closePopupMessage();
    //         return convertedFileContents.outputFiles;
    //     })
    //     .catch((err: any) => {
    //         throw err;
    //     });
}
