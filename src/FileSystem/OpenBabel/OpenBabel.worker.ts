import { randomID } from "@/Core/Utils";
import { sendResponseToMainThread } from "@/Core/WebWorkers/WorkerHelper";
import { FileInfo } from "../FileInfo";

// This runs from within a webworker

declare let Webobabel: any;

// let stdOutOrErr = "";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
importScripts("obabel-wasm/obabel.js");

let stdOutOrErr = "";
let oBabelModReady: any = undefined;

function runBabel(args: string[], inputFiles: FileInfo[]) {

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

            chmod(path: string, mode: string) {
                (this as any).FS.chmod(path, mode);
            },

            unlink(path: string) {
                (this as any).FS.unlink(path);
            },

            rmdir(path: string) {
                // Directory must be empty
                (this as any).FS.rmdir(path);
            }
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

    // debugger;

    return oBabelModReady
        .then((mod: any) => {
            // Create a temorary working directory.
            const tmpDir = "/tmp_" + randomID() + "/";
            mod.files.mkdir(tmpDir);
            mod.files.chmod(tmpDir, 0o777)

            // Save the input files to the virtual file system.
            for (const file of inputFiles) {
                mod.files.writeFile(tmpDir + file.name, file.contents);
            }

            // Modify the arguments to you're readying and writing from the new
            // temporary directory.
            const inputFileNames = new Set(inputFiles.map((file) => file.name));
            for (let i = 0; i < args.length; i++) {
                if (args[i] === "-O") {
                    args[i + 1] = tmpDir + args[i + 1];
                } else if (inputFileNames.has(args[i])) {
                    args[i] = tmpDir + args[i];
                }
            }

            const filesBeforeRun = mod.files.readDir(tmpDir);

            // I believe callMain is synchronous.
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            mod.callMain(args);

            const filesAfterRun = mod.files.readDir(tmpDir);

            // Keep those files in filesAfterRun that are not in
            // mod.filesBeforeRun. These are the new files.
            const newFiles = filesAfterRun.filter(
                (fileName: string) =>
                    !filesBeforeRun.includes(fileName)
            );

            const contents: string[] = newFiles.map(
                (fileName: string) => {
                    fileName = tmpDir + fileName;
                    return mod.files.readFile(fileName);
                }
            );

            // Remove the temporary directory.
            const filesToDelete = [...newFiles, ...inputFileNames];
            for (const fileName of filesToDelete) {
                mod.files.unlink(tmpDir + fileName);
            }
            mod.files.rmdir(tmpDir);

            return contents;
        })
        .then((outputFiles: any) => {
            return {
                outputFiles,
                stdOutOrErr,
            };
        })
        .catch((err: Error) => {
            throw err;
        });
}

self.onmessage = (params: MessageEvent) => {
    const argsSets = params.data.argsSets as string[][];
    const inputFiles = params.data.inputFiles as FileInfo[];
    // const outputFilePath = params.outputFilePath as string;

    const promises = argsSets.map((args) => {
        // TODO: You're sending all inputFiles for each runBabel call, because
        // you can't know which files are needed for each call. It would be
        // better to somehow persist the files/OpenBabel module and call it
        // multiple times. Need to investigate.
        return runBabel(args, inputFiles);
    });

    Promise.all(promises)
        .then((results: any) => {
            sendResponseToMainThread(results);
            return;
        })
        .catch((err: Error) => {
            throw err;
        });
};

// sendResponseToMainThread({
//     outputFiles,
//     stdOutOrErr,
// });
// return;
