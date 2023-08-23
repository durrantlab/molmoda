/* eslint-disable promise/no-nesting */
// This runs from within a webworker

import {
    sendResponseToMainThread,
    waitForDataFromMainThread,
} from "@/Core/WebWorkers/WorkerHelper";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import REDUCE_MODULE from "../../../../public/js/reduce/index.js";

waitForDataFromMainThread()
    .then((jobInfo: any) => {
        const startTime = performance.now();

        let std = "";
        let stdOut = "";
        let stdErr = "";
        const receptorPDB = jobInfo.input.contents;

        // https://emscripten.org/docs/api_reference/module.html

        return new Promise((resolve) => {
            return REDUCE_MODULE({
                noInitialRun: true,

                // stderr will log when any file is read.
                logReadFiles: true,

                // onRuntimeInitialized() { console.log("Runtime initialized"); },

                // preInit() { console.log("Pre-init"); },

                preRun: [
                    (mod: any) => {
                        // Save the contents of the files to the virtual
                        // file system
                        mod.FS.writeFile("/receptor.pdb", receptorPDB);
                    },
                ],

                /**
                 * A helper function to locate WASM files.
                 *
                 * @param {string} path  The requested path.
                 * @returns {string}  The actual path to the WASM file.
                 */
                locateFile(path: string): string {
                    // This is where the emscripten compiled files are
                    // located
                    return `./reduce/` + path;
                },

                /**
                 * A function that runs when the program exits.
                 */
                onExit(/* code */) {
                    // Update with output
                    jobInfo.output = {
                        std: std.trim(),
                        stdOut: stdOut.trim(),
                        stdErr: stdErr.trim(),
                        output: stdOut,
                        time: performance.now() - startTime,
                    };

                    // Resolve the promise with the output
                    resolve(jobInfo);
                },

                // Monitor stdout and stderr output

                /**
                 * A function that runs when stdout is written to.
                 *
                 * @param {string} text  The text written to stdout.
                 */
                print(text: string) {
                    // console.log(text);
                    stdOut += text + "\n";
                    std += text + "\n";
                },

                /**
                 * A function that runs when stderr is written to.
                 *
                 * @param {string} text  The text written to stderr.
                 */
                printErr(text: string) {
                    // console.log(text);
                    stdErr += text + "\n";
                    std += text + "\n";
                },
            })
                .then((instance: any) => {
                    // Probably not needed, but just in case
                    return instance.ready;
                })
                .then((instance: any) => {
                    const argsList = [
                        "-FLIP",
                        "/receptor.pdb",
                        "-DB",
                        "/reduce_wwPDB_het_dict.txt",
                    ];
                    return instance.callMain(argsList);
                });
        });
    })
    .then((response: any) => {
        sendResponseToMainThread(response);
        return;
    })
    .catch((err: Error) => {
        throw err;
    });
