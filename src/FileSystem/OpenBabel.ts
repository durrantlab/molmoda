import { dynamicImports } from "@/Core/DynamicImports";
import FS from "browserfs/dist/node/core/FS";

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
 * @param {Function} [onBeforeRun]  Function to run before running OpenBabel.
 *                                     Good for creating files. Optional.
 * @param {Function} [onAfterRun]   Function to run after running OpenBabel.
 *                                     Good for reading files. Optional.
 * @returns {Promise<string | void>}  A promise that resolves to the output of
 *     the program. Void if there is an error?
 */
export function runOpenBabel(
    args: string[],
    // eslint-disable-next-line @typescript-eslint/ban-types
    onBeforeRun?: Function,
    // eslint-disable-next-line @typescript-eslint/ban-types
    onAfterRun?: Function
): any {
    // Promise<string | void> {
    let stdOutOrErr = "";
    // let BFS: any;

    // return getFSPromise()
    //     .then(() => {
    //         /* eslint-disable @typescript-eslint/no-var-requires */
    //         // const Module = {
    //         //     arguments: "-L formats",
    //         // };
    //     })
    return dynamicImports.obabelwasm.module
        .then((obabelModule: any): Promise<string> => {
            // These functions aim to make it easier to access the file system.

            const fsHelperFuncs = {
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
                        return "js/obabel-wasm/" + path;
                    },
                    print: (text: string) => {
                        stdOutOrErr += text + "\n";
                    },
                    printErr: (text: string) => {
                        stdOutOrErr += text + "\n";
                    },
                    preRun: [
                        function (This: any) {
                            if (onBeforeRun) {
                                // Binding This and passing as parameter, to
                                // accomodate different preferences re.
                                // accessing the module.
                                onBeforeRun.bind(This)(This);
                            }
                        },
                    ],
                    onRuntimeInitialized: (This: any) => {
                        // TODO: Never called?
                        console.log("onRuntimeInitialized");
                    },
                    postRun: [
                        (This: any) => {
                            // Note: This runs when Wasm loaded and initialized,
                            // not after program executed. IS THAT TRUE?

                            // Yes, I think above is true. Need to wait for
                            // obabel to finish executing. But how?

                            let resolveVal: any;

                            if (onAfterRun) {
                                // Binding This and passing as parameter, to
                                // accomodate different preferences re.
                                // accessing the module.
                                resolveVal = onAfterRun.bind(This)(This);
                            }
                            resolve(resolveVal);
                        },
                    ],
                };

                // Bind Module to all the fs functions.
                Module.files._bindModule(Module);

                new obabelModule(Module);
            });
        })
        .then((output: any) => {
            console.log(stdOutOrErr);
            return {
                output,
                stdOutOrErr: stdOutOrErr,
            };
        })
        .catch((err: any) => {
            throw err;
        });
}
