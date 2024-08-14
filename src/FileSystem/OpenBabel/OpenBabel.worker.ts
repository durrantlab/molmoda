import { randomID } from "@/Core/Utils/MiscUtils";
import { sendResponseToMainThread } from "@/Core/WebWorkers/WorkerHelper";
import { FileInfo } from "../FileInfo";

// This runs from within a webworker

// declare let Webobabel: any;

// let stdOutOrErr = "";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// importScripts("obabel-wasm/obabel.js");

import * as Webobabel from "../../../public/js/obabel-wasm/obabel.js";

let oBabelModReady: any = undefined;
let stdOutOrErr = "";
let stdErr = "";

/**
 * Runs the Open Babel command line program.
 *
 * @param {string[]}   args        The arguments to pass to Open Babel.
 * @param {FileInfo[]} inputFiles  The input files.
 * @returns {Promise<any>}  A promise that resolves to an object that describes
 *     the result and execution.
 */
function runBabel(args: string[], inputFiles: FileInfo[]): Promise<any> {
    // Create the oBabelMod only once per webworker
    if (oBabelModReady === undefined) {
        // These functions aim to make it easier to access the file system.
        const fsHelperFuncs = {
            /**
             * A helper function that binds the fsHelperFuncs functions to the
             * Module object. This is so you can use "this" rather than pass it
             * the Module object.
             *
             * @param {any} Module  The Module object.
             * @returns {void}
             */
            _bindModule(Module: any) {
                // Bind fsHelp functions to this module. This is
                // so you can use "this" rather than pass it the
                // Module object.
                const This = this as any;
                for (const key in This) {
                    This[key] = This[key].bind(Module);
                }
            },

            /**
             * Helper function that creates a directory of the Open Babel file system.
             *
             * @param {string} path  The path to the directory to create.
             */
            mkdir(path: string) {
                (this as any).FS.mkdir(path, true, true);
            },

            /**
             * A helper function that creates a file in the Open Babel file system.
             *
             * @param {string} path    The path to the text file to create.
             * @param {string} text    The text to write to the file.
             */
            writeFile: function (path: string, text: string) {
                (this as any).FS.writeFile(path, text, {
                    encoding: "utf-8",
                    mode: 0o777,
                });
            },

            /**
             * A helper function that reads a file on the Open Babel file system.
             *
             * @param {string} path    The path to the file to read.
             * @returns {string}  The text in the file.
             */
            readFile(path: string): string {
                return new TextDecoder("utf-8").decode(
                    (this as any).FS.readFile(path)
                );
            },

            /**
             * A helper function that lists the file in a directory on the Open Babel file
             * system.
             *
             * @param {string} path    The path to the directory to read.
             * @returns {string[]}   The files in the directory.
             */
            readDir(path: string): string[] {
                return (this as any).FS.readdir(path);
            },

            /**
             * A helper function that changes the permissions of a file on the Open Babel
             * file system.
             *
             * @param {string} path  The path to the file to change.
             * @param {string} mode  The mode to change to.
             */
            chmod(path: string, mode: string) {
                (this as any).FS.chmod(path, mode);
            },

            /**
             * A helper function that deletes a file on the Open Babel file system.
             *
             * @param {string} path  The path to the file to delete.
             */
            unlink(path: string) {
                (this as any).FS.unlink(path);
            },

            /**
             * A helper function that deletes a directory on the Open Babel file system.
             *
             * @param {string} path  The path to the directory to delete.
             */
            rmdir(path: string) {
                // Directory must be empty
                (this as any).FS.rmdir(path);
            },
        };

        const Module = {
            // arguments: args,
            // arguments: ["-L", "formats"],
            files: fsHelperFuncs,
            // filesBeforeRun: [],
            logReadFiles: true,
            noInitialRun: true,
            // noExitRuntime: true,
            locateFile: (path: string) => {
                return "obabel-wasm/" + path;
            },
            print: (text: string) => {
                stdOutOrErr += text + "\n";
            },
            printErr: (text: string) => {
                stdOutOrErr += text + "\n";
                stdErr += text + "\n";
            },
            preRun: [
                function (This: any) {
                    This.ENV.BABEL_DATADIR = "/data";
                },
            ],
        };

        Module.files._bindModule(Module);
        oBabelModReady = Webobabel(Module);
    }

    return oBabelModReady
        .then((mod: any) => {
            // Create a temorary working directory.
            const tmpDir = "/tmp_" + randomID() + "/";
            mod.files.mkdir(tmpDir);
            mod.files.chmod(tmpDir, 0o777);

            // Verify that the names of each inputFile are unique. Throw an
            // error otherwise.
            const inputFileNameSet = new Set(
                inputFiles.map((file) => file.name)
            );
            if (inputFileNameSet.size !== inputFiles.length) {
                console.log(
                    "Uniq names:",
                    inputFileNameSet,
                    ". Size != ",
                    inputFiles.length
                );
                throw new Error("Input file names must be unique.");
            }

            // Save the input files to the virtual file system.
            for (const file of inputFiles) {
                mod.files.writeFile(tmpDir + file.name, file.contents);
            }

            // You're copying over many input files. You need to know which one
            // is actually used for this calculation.
            let inputFileActuallyUsed: FileInfo | undefined = undefined;
            let outputFileActuallyUsed: string | undefined = undefined;

            // Modify the arguments to you're readying and writing from the new
            // temporary directory.
            for (let i = 0; i < args.length; i++) {
                if (args[i] === "-O") {
                    // Rewrite output so it goes to the temporary directory.
                    outputFileActuallyUsed = args[i + 1];
                    args[i + 1] = tmpDir + args[i + 1];
                } else if (inputFileNameSet.has(args[i])) {
                    // So not -O. Must be an input file. Rewrite so it goes to
                    // the temporary directory.
                    inputFileActuallyUsed = inputFiles.find(
                        (file) => file.name === args[i]
                    );
                    args[i] = tmpDir + args[i];
                }
            }

            // It's important that the input and output files be sufficiently
            // different. Because -m might overwrite an already existant file
            // otherwise.
            let inputFileBaseWithoutNumbers = (<FileInfo>(
                inputFileActuallyUsed
            )) as FileInfo | string;
            if (inputFileBaseWithoutNumbers !== undefined) {
                inputFileBaseWithoutNumbers = (
                    inputFileBaseWithoutNumbers as FileInfo
                ).name
                    .replace(/\d/g, "")
                    .split(".")[0];
            }

            const outputFileBaseWithoutNumbers = outputFileActuallyUsed
                ?.replace(/\d/g, "")
                .split(".")[0];

            if (
                inputFileBaseWithoutNumbers === outputFileBaseWithoutNumbers &&
                <FileInfo>inputFileActuallyUsed !== undefined
            ) {
                throw new Error(
                    "Input and output file names must be sufficiently different: " +
                        (<FileInfo>inputFileActuallyUsed).name +
                        " vs. " +
                        outputFileActuallyUsed
                );
            }

            const filesBeforeRun = mod.files.readDir(tmpDir);

            try {
                // I believe callMain is synchronous.
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                mod.callMain(args);
            } catch (err) {
                console.log("ERR", err);
                console.log(args);
                console.log(inputFiles[0].contents);
                stdOutOrErr += err;
                stdErr += err;
            }

            const filesAfterRun = mod.files.readDir(tmpDir);

            // Keep those files in filesAfterRun that are not in
            // mod.filesBeforeRun. These are the new files.
            let newFiles = filesAfterRun.filter(
                (fileName: string) => !filesBeforeRun.includes(fileName)
            );

            if (
                newFiles.length === 0 &&
                args.indexOf("-L") === -1 &&
                args.indexOf("--version") === -1
            ) {
                // There was no new files for some reason. Output a warning, and
                // return the input molecule.
                console.warn("No new files were created.");
                newFiles = [inputFileActuallyUsed?.name];
            }

            const contents: string[] = newFiles.map((fileName: string) => {
                if (fileName === inputFileActuallyUsed?.name) {
                    return "{ERROR}";
                }
                fileName = tmpDir + fileName;
                return mod.files.readFile(fileName);
            });

            // Remove the temporary directory. Keep only unique.
            const filesToDelete = [
                ...new Set([...newFiles, ...inputFileNameSet]),
            ];
            for (const fileName of filesToDelete) {
                mod.files.unlink(tmpDir + fileName);
            }
            mod.files.rmdir(tmpDir);

            return [inputFileActuallyUsed?.auxData, contents];
        })
        .then((outputFilesData: [any, string[]]) => {
            return {
                orderIdxs: outputFilesData[0],
                outputFiles: outputFilesData[1],
                stdOutOrErr,
                stdErr,
            };
        })
        .catch((err: Error) => {
            throw err;
        });
}

/**
 * If the input is a PDB file, and the output is a PDB file, then OpenBabel is
 * not needed. This function checks for that case, and if so, returns the output
 * files.
 *
 * @param {string[]}   args        The arguments that would be passed to Open
 *                                 Babel.
 * @param {FileInfo[]} inputFiles  The input files.
 * @returns {boolean | Promise<any>}  If false, then this function is not
 *                                    applicable. If a Promise, then this
 *                                    function is applicable, and the output
 *                                    files are ready.
 */
function easyParsePDBIfPossible(
    args: string[],
    inputFiles: any
): boolean | Promise<any> {
    const testArgs = args.filter((arg) => arg !== "-m" && arg !== "-O");
    if (testArgs.length !== 2) {
        return false;
    }

    // If here, testArgs is like ['tmpmol0.pdb', 'tmp0.pdb']

    // Validate file extensions without additional splits. They must both end in pdb.
    const fileExt = [".pdb", ".PDB"];
    if (
        !fileExt.includes(testArgs[0].slice(-4)) ||
        testArgs[0].slice(-4) !== testArgs[1].slice(-4)
    ) {
        return false;
    }

    // Find the file without iterating over the entire array
    const fileInfoToUse = inputFiles.find((f: any) => f.name === testArgs[0]);
    if (!fileInfoToUse) {
        return false;
    }

    // Find lines that are, in their entirety, either END or ENDMDL. Split the
    // contents on those lines.
    const pdbTxtToParse = fileInfoToUse.contents.trim();
    const lines = pdbTxtToParse.split("\n");

    // Efficiently check and add the last line if needed
    const lastLine = lines[lines.length - 1].trim();
    if (lastLine !== "END" && lastLine !== "ENDMDL") {
        lines.push("END");
    }

    const splitLines: string[][] = [];
    let currentSplitLine: string[] = [];
    for (const line of lines) {
        if (line === "END" || line === "ENDMDL") {
            splitLines.push(currentSplitLine);
            currentSplitLine = [];
        } else {
            currentSplitLine.push(line);
        }
    }

    return Promise.resolve({
        orderIdxs: fileInfoToUse.auxData,
        outputFiles: splitLines.map((lines) => lines.join("\n")),
    });
}

let currentlyRunning = false;

self.onmessage = (params: MessageEvent) => {
    if (currentlyRunning) {
        throw new Error("Already running");
    }

    currentlyRunning = true;
    const argsSets = params.data.map((d: any) => d.args); // params.data.argsSets as string[][];
    const inputFiles = params.data.map((d: any) => d.inputFile); // params.data.inputFiles as FileInfo[];
    // const outputFilePath = params.outputFilePath as string;

    const promises = argsSets.map((args: string[]) => {
        // TODO: You're sending all inputFiles for each runBabel call, because
        // you can't know which files are needed for each call. It would be
        // better to somehow persist the files/OpenBabel module and call it
        // multiple times. Need to investigate.

        // Args just contains the parameters, e.g., ['tmpmol0.pdb', '-m', '-O', 'tmp0.pdb']

        // inputFiles is a LIST of FileInfos. .name is filename, .contents is file contents.

        // Converting pdb to pdb should not be done with open babel. It is very
        // slow for large PDB files. But if -p, or --gen3D, then let openbabel
        // handle it.
        const pdbToPdbPromise = easyParsePDBIfPossible(args, inputFiles);
        if (pdbToPdbPromise !== false) {
            return pdbToPdbPromise;
        }

        return runBabel(args, inputFiles);
    });

    Promise.all(promises)
        .then((results: any) => {
            sendResponseToMainThread(results);
            currentlyRunning = false;
            return;
        })
        .catch((err: Error) => {
            throw err;
        });
};
