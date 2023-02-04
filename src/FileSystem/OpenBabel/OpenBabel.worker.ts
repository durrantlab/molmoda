import {
    sendResponseToMainThread,
    waitForDataFromMainThread,
} from "@/Core/WebWorkers/WorkerHelper";
import { FileInfo } from "../FileInfo";

// This runs from within a webworker

declare let Webobabel: any;

let stdOutOrErr = "";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
importScripts("obabel-wasm/obabel.js");

waitForDataFromMainThread()
    .then((params: any) => {
        const args = params.args as string[];
        const inputFiles = params.inputFiles as FileInfo[];
        const outputFilePath = params.outputFilePath as string;

        stdOutOrErr = "";

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
        };

        return new Promise((resolve) => {
            const Module = {
                arguments: args,
                // arguments: ["-L", "formats"],
                files: fsHelperFuncs,
                logReadFiles: true,
                noInitialRun: false,
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
                        // Save any input files
                        for (const file of inputFiles) {
                            This.files.writeFile(file.name, file.contents);
                        }
                        This.ENV.BABEL_DATADIR = "/data";
                    },
                ],
                onRuntimeInitialized: (/* This: any */) => {
                    // TODO: Never called?
                    console.log("onRuntimeInitialized");
                },
                postRun: [
                    (This: any) => {
                        // Note: This runs when Wasm loaded and initialized,
                        // not after program executed. IS THAT TRUE?

                        // Yes, I think above is true. Need to wait for
                        // obabel to finish executing. But how?

                        const contents = This.files.readFile(outputFilePath);
                        resolve(contents);
                    },
                ],
            };

            // Bind Module to all the fs functions.
            Module.files._bindModule(Module);

            new Webobabel(Module);
        });
    })
    .then((outputFile: any) => {
        sendResponseToMainThread({
            outputFile,
            stdOutOrErr,
        });
        return;
    })
    .catch((err: Error) => {
        throw err;
    });
