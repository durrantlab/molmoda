import { dynamicImports } from "@/Core/DynamicImports";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// import OpenBabel from "@/libs/ToCopy/obabel-wasm/obabel";
// import { initOpenBabel } from "@/libs/ToCopy/obabel-wasm/obabel";

let txtBuf = "";

/**
 *
 * @param {string[]}   args            The arguments to pass to OpenBabel.
 * @param {Function} [beforeRunFuncs]  Function to run before running OpenBabel.
 *                                     Good for creating files. Optional.
 * @param {Function} [afterRunFuncs]   Function to run after running OpenBabel.
 *                                     Good for reading files. Optional.
 * @returns {Promise<string | void>}  A promise that resolves to the output of
 *     the program. Void if there is an error?
 */
export function runOpenBabel(
    args: string[],
    // eslint-disable-next-line @typescript-eslint/ban-types
    beforeRunFuncs?: Function,
    // eslint-disable-next-line @typescript-eslint/ban-types
    afterRunFuncs?: Function
): Promise<string | void> {
    txtBuf = "";
    let BFS: any;

    return dynamicImports.browserfs.module
        .then((browserfs: any) => {
            BFS = new browserfs.EmscriptenFS() as any;
            return dynamicImports.obabelwasm.module;
        })
        // .then((obabelwasm: any) => {
            // debugger;
        // });

        //     // No PDB, MOL2, XYZ, etc.
        //     // No --gen3D, --gen2D
        //     // Running in webworker?

        //     // const module = {
        //     //     arguments: args,
        //     //     fs: BFS,
        //     //     logReadFiles: true,
        //     //     noInitialRun: true,
        //     //     locateFile: (path: string) => {
        //     //         return "js/obabel-wasm/" + path;
        //     //     },
        //     //     print: (text: string) => {
        //     //         debugger;
        //     //         txtBuf += text + "\n";
        //     //     },
        //     //     printErr: (text: string) => {
        //     //         txtBuf += text + "\n";
        //     //     },
        //     //     preRun: [
        //     //         () => {
        //     //             // console.log("preRun");
        //     //             // console.log(WEBOBABEL_Module.FS);
        //     //         },
        //     //     ],
        //     //     onRuntimeInitialized: () => {
        //     //         // console.log("onRuntimeInitialized");
        //     //     },
        //     //     postRun: [
        //     //         () => {
        //     //             // Note: This runs when Wasm loaded and initialized, not after program
        //     //             // executed.
        //     //             // console.log("postRun");
        //     //             // this.inputs.push({ q: args, re: txtBuf });
        //     //             // args = [];
        //     //         },
        //     //     ]
        //     // };

        //     // debugger;

        //     // return initOpenBabel(module);
        //     // return "";  // TODO: FIX
        // })
        .then((obabel: any): Promise<string> => {

            // obabel.FS.mkdir("/data", true, true);
            // //obabel.FS.mount(BFS, {root: '/'}, '/data');
            // // write file with permission 0777
            // obabel.FS.writeFile("input1.smi", "C1=CC=CC=C1", {
            //   encoding: "utf-8",
            //   mode: 0o777,
            // });

            if (beforeRunFuncs) {
                beforeRunFuncs(obabel);
            }

            // resolve the promise to write the file
            return new Promise((resolve) => {
                // obabel.FS.syncfs(false, () => {
                    //   console.log("syncfs");
                    // debugger

                    // callMain with the arguments
                    // obabel.callMain(obabel.arguments);
                    debugger;
                    obabel.callMain("-L", "formats");

                    if (afterRunFuncs) {
                        afterRunFuncs(obabel);
                    }

                    resolve(txtBuf);
                // });
            });

            // obabel.FS.writeFile(
            //   "input.smi",
            //   "O1C=C[C@H]([C@H]1O2)c3c2cc(OC)c4c3OC(=O)C5=C4CCC(=O)5"
            // );
            // //
            // //obabel.run();

            // //obabel.FS.writeFile("input1.smi", "C1=CC=CC=C1");
            // //obabel.FS.writeFile('input.smi', "O1C=C[C@H]([C@H]1O2)c3c2cc(OC)c4c3OC(=O)C5=C4CCC(=O)5");
            // //obabel.run();
            // //obabel.FS.mkdir('/data', true, true);
            // console.log("Reading files", obabel.FS.readdir("/"));
            // // console.log(
            // //   new TextDecoder("utf-8").decode(obabel.FS.readFile("out.sdf"))
            // // );
            // console.log(
            //   new TextDecoder("utf-8").decode(obabel.FS.readFile("input.smi"))
            // );
            // console.log(
            //   new TextDecoder("utf-8").decode(obabel.FS.readFile("input1.smi"))
            // );
            // console.log(obabel.FS.stat("input.smi").mode & parseInt("777", 8));
            // console.log(obabel.FS.stat("input1.smi").mode & parseInt("777", 8));
            // // console.log(obabel.FS.stat("out.sdf").mode & parseInt("777", 8));
        })
        .catch((err: any) => {
            console.log(err);
        });
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
 * @param {any}    obabel  The OpenBabel module.
 * @param {string} path    The path to the text file to create.
 * @param {string} text    The text to write to the file.
 */
export function writeFile(obabel: any, path: string, text: string) {
    obabel.FS.writeFile(path, text, {
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
    return obabel.FS.readdir(path);
}

/**
 * A helper function that reads a file on the Open Babel file system.
 *
 * @param {any}    obabel  The OpenBabel module.
 * @param {string} path    The path to the file to read.
 * @returns {string}  The text in the file.
 */
export function readFile(obabel: any, path: string): string {
    return new TextDecoder("utf-8").decode(obabel.FS.readFile(path));
}
