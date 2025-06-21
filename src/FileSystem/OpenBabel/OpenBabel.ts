import { messagesApi } from "@/Api/Messages";
import { PopupVariant } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import { FileInfo } from "../FileInfo";
import { IFileInfo } from "../Types";
import {
    IFormatInfo,
    getFormatInfoGivenType,
} from "../LoadSaveMolModels/Types/MolFormats";
import { OpenBabelQueue } from "./OpenBabelQueue";
import { isTest } from "@/Testing/SetupTests";
import {
    IUserArgOption,
    IUserArgSelect,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";

export enum WhichMolsGen3D {
    All,
    None,
    OnlyIfLacks3D,
}

export enum Gen3DLevel {
    None = "none",
    Fastest = "fastest",
    Fast = "fast",
    Medium = "medium",
    Better = "better",
    Best = "best",

    // Default used to be medium for speed, but I was surprised to learn that
    // even ATP (basic molecule) had bad geometry unless best. SMILES I used for
    // testing:
    // O[C@@H]1[C@@H](CO[P@@](=O)(O[P@](=O)(OP(=O)(O)O)O)O)O[C@H]([C@@H]1O)n1cnc2c1ncnc2N

    // Default = "medium",
    Default = "best",
}

export interface IGen3DOptions {
    whichMols: WhichMolsGen3D;
    level?: Gen3DLevel;
}

/**
 * Gets the user argument select for specifying how to generate 3D coordinates.
 *
 * @param {string}  label              The label for the argument.
 * @param {string}  description        The description for the argument.
 * @param {boolean} includeNoneOption  Whether to include the "none" option.
 * @param {string}  defaultVal         The default value for the argument.
 * @returns {IUserArgSelect}  The user argument.
 */
export function getGen3DUserArg(
    label: string,
    description: string,
    includeNoneOption = false,
    defaultVal=Gen3DLevel.Medium
): IUserArgSelect {
    const options = [
        {
            description:
                "fastest: no forcefield optimization or conformer search",
            val: "fastest",
        },
        {
            description:
                "fast: quick forcefield optimization, no conformer search",
            val: "fast",
        },
        {
            description:
                "medium: quick forcefield optimization and fast conformer search",
            val: "medium",
        },
        {
            description:
                "better: medium forcefield optimization and fast conformer search",
            val: "better",
        },
        {
            description:
                "best: max forcefield optimization and thorough conformer search",
            val: "best",
        },
    ] as IUserArgOption[];

    // let defaultVal = "medium";

    if (includeNoneOption) {
        options.unshift({
            description:
                "recommended: quick forcefield optimization and fast conformer search",
            val: "medium",
        });
        options.unshift({
            description: "none: do not generate 3D coordinates",
            val: "none",
        });
        defaultVal = Gen3DLevel.None;
    }

    return {
        label: label,
        description: description,
        id: "gen3D",
        val: defaultVal,
        options: options,
    } as IUserArgSelect;
}

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
 * @param {boolean}      [surpressMsgs=false]    Whether to surpress messages.
 * @returns {Promise<any>}  A promise that resolves to the output of the
 *     program. Void if there is an error?
 */
async function runOpenBabel(
    appId: string,
    argsLists: string[][],
    inputFiles: FileInfo[] | IFileInfo[],
    surpressMsgs = false
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
            surpressMsgs,
        });
    }

    const maxProcs = (await getSetting("maxProcs")) as number;

    return await new OpenBabelQueue(appId, payloads, maxProcs).done;
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

    let msgTimer = undefined;
    if (warningNeeded && !isTest) {
        msgTimer = setTimeout(() => {
            // Warn user

            messagesApi.popupMessage(
                "Converting Compounds to 3D",
                "<p>One or more input molecules does not include 3D coordinates. Currently calculating coordinates, which could take a while. Molecule(s) will appear in the Viewer when ready.</p><p>Tip: You can select the method for generating coordinates via <i>File → Open...</i> to speed up the calculation or improve the quality of the generated structures.</p>",
                PopupVariant.Warning,
                undefined,
                false,
                {}
            );
        }, 2000);
    }

    return msgTimer;
}

/**
 * Gets the formats that OpenBabel can read and write. NOTE: this breaks
 * openbabel! It's not clear why. So just use it to see the formats (for
 * debugging), then uncomment.
 *
 * @returns {Promise<IFormatInfo[]>}  A promise that resolves to the formats.
 */
// export async function getObabelFormats(): Promise<IFormatInfo[]> {
//     const fakeFile = new FileInfo({
//         name: "fakeFile",
//         contents: "",
//     } as IFileInfo);
//     const obabelFormats = await runOpenBabel(
//         "getFormats",
//         [["-L", "formats"]],
//         // [["--version"]],
//         [fakeFile]
//     );

//     console.log(obabelFormats[0].stdOutOrErr);

//     return obabelFormats;
// }

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
 * @param  {FileInfo[]}    fileInfos             The information about the file
 *                                               to convert.
 * @param  {string}        targetFormat          The target extension.
 * @param  {IGen3DOptions} [gen3D]               Whether to assign 3D
 *                                               coordinates.
 * @param  {number | null} [pH]                  The pH to use for protonation.
 *                                               If null, removes hydrogen
 *                                               atoms.
 * @param  {boolean}       [desalt=false]        Whether to desalt the
 *                                               molecules.
 * @param  {boolean}       [surpressMsgs=false]  Whether to surpress messages.
 * @returns {Promise<string[]>}  A promise that resolves to the converted
 *    molecules.
 */
async function convertToNewFormat(
    fileInfos: FileInfo[],
    targetFormat: string,
    gen3D?: IGen3DOptions,
    pH?: number | null,
    desalt = false,
    surpressMsgs = false
): Promise<string[]> {
    const cmdsList = fileInfos.map((fileInfo: FileInfo) => {
        const cmds = [fileInfo.name, "-m"]; // Note always dividing into multiple files.

        if (desalt) {
            cmds.push(...["-r"]);
        }

        // If not specified, set to only if lacks 3d.
        let whichMols =
            gen3D?.whichMols === undefined
                ? WhichMolsGen3D.OnlyIfLacks3D
                : gen3D.whichMols;
        if (gen3D?.level === Gen3DLevel.None) {
            // A second way to say no 3D generation.
            whichMols = WhichMolsGen3D.None;
        }

        // If not specified, set to default
        const level =
            gen3D?.level === undefined ? Gen3DLevel.Default : gen3D.level;

        switch (whichMols) {
            case WhichMolsGen3D.All:
                cmds.push(...["--gen3D", level]);
                break;
            case WhichMolsGen3D.OnlyIfLacks3D:
                if (fileInfo.auxData.lacks3D === true) {
                    cmds.push(...["--gen3D", level]);
                }
                break;
            default:
                break;
        }

        // if (
        //     gen3D === true ||
        //     (fileInfo.auxData !== undefined &&
        //         fileInfo.auxData.lacks3D === true)
        // ) {
        //     cmds.push(...["--gen3D", "best"]);
        // }

        if (pH !== undefined && pH !== null) {
            cmds.push(...["-p", pH.toString()]);
        } else if (pH === null) {
            // Removes hydrogens. Good for 2D visualizations.
            cmds.push(...["-d"]);
        }

        // Are there additional arguments to pass to OpenBabel?
        const formatInfo = getFormatInfoGivenType(targetFormat);

        const extToUse = formatInfo?.obabelFormatName ?? targetFormat;
        cmds.push(...["-O", "tmpout." + extToUse]);

        if (formatInfo?.extraObabelArgs !== undefined) {
            cmds.push(...formatInfo.extraObabelArgs);
        }

        // console.log(cmds);

        return cmds;
    });

    // tmpPass = [cmdsList, fileInfos.map(f => JSON.parse(JSON.stringify(f)))];
    const convertedFileContents = await runOpenBabel(
        "convert",
        cmdsList,
        fileInfos,
        surpressMsgs
    );

    // The output files are located in the .outputFiles properties.
    // Flatten them into one array.
    return convertedFileContents.map((c: any) => c.outputFiles).flat();
}

/**
 * Converts a molecule to another format using OpenBabel.
 *
 * @param  {FileInfo[]}  srcFileInfos          The information about the file to
 *                                             convert.
 * @param  {string}      targetFormat          The target extension.
 * @param  {boolean}     [gen3D]               Whether to assign 3D coordinates.
 * @param  {number}      [pH]                  The pH to use for protonation. If
 *                                             null, removes hydrogens (-d).
 * @param  {boolean}     [desalt=false]        Whether to desalt the molecules.
 * @param  {boolean}     [surpressMsgs=false]  Whether to surpress messages.
 * @returns {Promise<string>}  A promise that resolves to the converted
 *     molecule.
 */
export async function convertFileInfosOpenBabel(
    srcFileInfos: FileInfo[], // Can be multiple-model SDF file, for example.
    targetFormat: string,
    gen3D?: IGen3DOptions,
    pH?: number | null,
    desalt = false,
    surpressMsgs = false
    // debug?: boolean
): Promise<string[]> {
    // Get info about the file
    const formatInfos = srcFileInfos.map((f) => f.getFormatInfo());

    const msgTimer = considerThreeDNeededWarning(formatInfos);

    const fileInfos = await separateFiles(srcFileInfos, formatInfos);

    const outputFiles = await convertToNewFormat(
        fileInfos,
        targetFormat,
        gen3D,
        pH,
        desalt,
        surpressMsgs
    );

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
