import { dynamicImports } from "@/Core/DynamicImports";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// import OpenBabel from "@/libs/ToCopy/obabel-wasm/obabel";
// import { initOpenBabel } from "@/libs/ToCopy/obabel-wasm/obabel";

export let BFS: any = undefined;

function getFSPromise(): Promise<any> {
    let fsPromise: Promise<any>;

    // Load BFS
    if (BFS === undefined) {
        fsPromise = dynamicImports.browserfs.module.then((browserfs: any) => {
        // fsPromise = dynamicImports.memfs.module.then((browserfs: any) => {
                //browserfs.initialize(new browserfs.FileSystem.InMemory());
            browserfs.configure({ fs: "InMemory" }, (e: any) => {
                if (e) {
                    throw e;
                }
            });
            BFS = new browserfs.EmscriptenFS() as any;
            // debugger;
            //FS.createFolder(FS.root, 'data', true, true);

            //FS.mount(FS, {root: '/'}, '/data');
            debugger;
            return BFS;
        });
    } else {
        fsPromise = Promise.resolve(BFS);
    }
    return fsPromise;
}

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
    let txtBuf = "";
    // let BFS: any;

    return (
        getFSPromise()
            .then(() => {
                /* eslint-disable @typescript-eslint/no-var-requires */
                // const Module = {
                //     arguments: "-L formats",
                // };
                return dynamicImports.obabelwasm.module;
            })
            .then((obabelModule: any): Promise<string> => {
                const Module = {
                    //arguments: args,
                    arguments: ["-L", "formats"],
                    //fs: FS,
                    logReadFiles: true,
                    noInitialRun: false,
                    locateFile: (path: string) => {
                        return "js/obabel-wasm/" + path;
                    },
                    print: (text: string) => {
                        txtBuf += text + "\n";
                    },
                    printErr: (text: string) => {
                        txtBuf += text + "\n";
                    },
                    preRun: [
                        (This: any) => {
                            // This.FS.mkdir("/data");
                            // This.FS.mount(BFS, { root: "/" }, "/data");
                            debugger;
                            This.FS.mkdir("/data");
                            This.FS.mount(BFS, { root: "/" }, "/data");

                            console.log("preRun");
                            //console.log(WEBOBABEL_Module.FS);

                            if (onBeforeRun) {
                                onBeforeRun(This);
                            }
                        },
                    ],
                    onRuntimeInitialized: (This: any) => {
                        // TODO: Never called?

                        console.log("onRuntimeInitialized");
                    },
                    postRun: [
                        () => {
                            console.log("postRun");
                        },

                        console.log("postRun"),

                        (This: any) => {
                            //debugger;
                            const tmp = This.FS.readdir("/");

                            console.log("readDir:", tmp);

                            //debugger;
                            // Note: This runs when Wasm loaded and initialized, not after program
                            // executed. IS THAT TRUE?

                            // Yes, I think above is true. Need to wait for obabel to finish executing. But how?

                            if (onAfterRun) {
                                onAfterRun(This);
                            }
                            //resolve(txtBuf);
                            //debugger;
                        },
                    ],
                }

                return new obabelModule(Module);
            })
            .then((myModule: any) => {
                debugger;
                console.log(txtBuf);
                return;
                //return Promise.resolve("test");
                //debugger;
                // return new Promise((resolve) => {
                //     // https://emscripten.org/docs/api_reference/module.html
                //     obabelModule({
                //         //arguments: args,
                //         arguments: ["-L", "formats"],
                //         fs: FS,
                //         logReadFiles: true,
                //         noInitialRun: true,
                //         locateFile: (path: string) => {
                //             return "js/obabel-wasm/" + path;
                //         },
                //         print: (text: string) => {
                //             txtBuf += text + "\n";
                //         },
                //         printErr: (text: string) => {
                //             txtBuf += text + "\n";
                //         },
                //         preRun: [
                //             (This: any) => {
                //                  console.log("preRun");
                //                  //console.log(WEBOBABEL_Module.FS);

                //                 if (onBeforeRun) {
                //                     onBeforeRun(This);
                //                 }
                //             },
                //         ],
                //         onRuntimeInitialized: () => {
                //              console.log("onRuntimeInitialized");
                //         },
                //         postRun: [
                //             (This: any) => {
                //                 // Note: This runs when Wasm loaded and initialized, not after program
                //                 // executed. IS THAT TRUE?

                //                 // Yes, I think above is true. Need to wait for obabel to finish executing. But how?

                //                 if (onAfterRun) {
                //                     onAfterRun(This);
                //                 }
                //                 resolve(txtBuf);
                //             },
                //         ],
                //     });
                // });
            })
            // .then((output: string) => {
            //     console.log("output");
            // //     debugger;
            // //     // return obabel.ready;
            //      return output;

            // //     // obabel.FS.mkdir("/data", true, true);
            // //     // //obabel.FS.mount(BFS, {root: '/'}, '/data');
            // //     // // write file with permission 0777
            // //     // obabel.FS.writeFile("input1.smi", "C1=CC=CC=C1", {
            // //     //   encoding: "utf-8",
            // //     //   mode: 0o777,
            // //     // });

            // //     // if (beforeRunFuncs) {
            // //     //     beforeRunFuncs(obabel);
            // //     // }

            // //     // // resolve the promise to write the file
            // //     // return new Promise((resolve) => {
            // //     //     // obabel.FS.syncfs(false, () => {
            // //     //         //   console.log("syncfs");
            // //     //         // debugger

            // //     //         // callMain with the arguments
            // //     //         // obabel.callMain(obabel.arguments);
            // //     //         debugger;
            // //     //         obabel.callMain("-L", "formats");

            // //     //         if (afterRunFuncs) {
            // //     //             afterRunFuncs(obabel);
            // //     //         }

            // //     //         resolve(txtBuf);
            // //     //     // });
            // //     // });

            // //     // obabel.FS.writeFile(
            // //     //   "input.smi",
            // //     //   "O1C=C[C@H]([C@H]1O2)c3c2cc(OC)c4c3OC(=O)C5=C4CCC(=O)5"
            // //     // );
            // //     // //
            // //     // //obabel.run();

            // //     // //obabel.FS.writeFile("input1.smi", "C1=CC=CC=C1");
            // //     // //obabel.FS.writeFile('input.smi', "O1C=C[C@H]([C@H]1O2)c3c2cc(OC)c4c3OC(=O)C5=C4CCC(=O)5");
            // //     // //obabel.run();
            // //     // //obabel.FS.mkdir('/data', true, true);
            // //     // console.log("Reading files", obabel.FS.readdir("/"));
            // //     // // console.log(
            // //     // //   new TextDecoder("utf-8").decode(obabel.FS.readFile("out.sdf"))
            // //     // // );
            // //     // console.log(
            // //     //   new TextDecoder("utf-8").decode(obabel.FS.readFile("input.smi"))
            // //     // );
            // //     // console.log(
            // //     //   new TextDecoder("utf-8").decode(obabel.FS.readFile("input1.smi"))
            // //     // );
            // //     // console.log(obabel.FS.stat("input.smi").mode & parseInt("777", 8));
            // //     // console.log(obabel.FS.stat("input1.smi").mode & parseInt("777", 8));
            // //     // // console.log(obabel.FS.stat("out.sdf").mode & parseInt("777", 8));

            //  })
            .catch((err: any) => {
                throw err;
            })
    );
}

/**
 * Helper function that creates a directory of the Open Babel file system.
 *
 * @param {any} obabel   The OpenBabel module.
 * @param {string} path  The path to the directory to create.
 */
export function mkdir(obabel: any, path: string) {
    obabel.FS.mkdir(path, true, true);
}

/**
 * A helper function that creates a file in the Open Babel file system.
 *
 * @param {string} path    The path to the text file to create.
 * @param {string} text    The text to write to the file.
 */
export function writeFile(obabel: any, path: string, text: string): any {
    // return getFSPromise()
    // .then((FS) => {
    //     FS.nodefs.writeFile(path, text, {
    //         encoding: "utf-8",
    //         mode: 0o777,
    //     });
    //     return;
    // })
    // .catch((err: any) => {
    //     throw err;
    // });

    // debugger;

    obabel.fs.nodefs.writeFileSync(path, text, {
        encoding: "utf-8",
        mode: 0o777,
    });
}

/**
 * A helper function that lists the file in a directory on the Open Babel file
 * system.
 *
 * @param {any}    obabel  The OpenBabel module.
 * @param {string} path    The path to the directory to read.
 * @returns {string[]}   The files in the directory.
 */
export function readDir(obabel: any, path: string): string[] {
    return obabel.fs.nodefs.readdirSync(path);
}

/**
 * A helper function that reads a file on the Open Babel file system.
 *
 * @param {string} path    The path to the file to read.
 * @returns {string}  The text in the file.
 */
export function readFile(obabel: any, path: string): string {
    // return getFSPromise()
    // .then((FS) => {
    //     return new TextDecoder("utf-8").decode(FS.nodefs.readFile(path));
    // });

    return new TextDecoder("utf-8").decode(obabel.fs.nodefs.readFileSync(path));
}
