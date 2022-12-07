/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as BrowserFS from "browserfs";

// @ts-ignore
import obabelModule from "@/libs/ToCopy/obabel-wasm/obabel";

/**
 * Mounts a localStorage-backed file system into the /data folder of Emscripten's file system.
 */
 function setupBFS() {
    // Set up BrowserFS keeping in mind that I'm importing emscriptem as an es6
    // module.
    // BrowserFS.install(window);
    // Initialize the file system.
    BrowserFS.initialize(new BrowserFS.FileSystem.InMemory());
    // Create the Emscripten file system.
    const BFS = new BrowserFS.EmscriptenFS() as any;
    debugger;
    // Mount the file system.
    BFS.mount("/data", BFS.createFolder("/data", true, true));
    return BFS;


    // // Grab the BrowserFS Emscripten FS plugin.
    // const BFS = new BrowserFS.EmscriptenFS();
    // // Create the folder that we'll turn into a mount point.
    // // @ts-ignore
    // FS.createFolder(FS.root, 'data', true, true);
    // // Mount BFS's root folder into the '/data' folder.
    // // @ts-ignore
    // FS.mount(BFS, {root: '/'}, '/data');
  }

export function obTest() {
    // const BFS = setupBFS();

    let txtBuf = "";

    const obabel = obabelModule({
        arguments: ["-L", "formats"],
        // fs: BFS,
        logReadFiles: true,
        // noInitialRun: true,
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
                console.log("preRun");
                // console.log(WEBOBABEL_Module.FS);
            },
        ],
        onRuntimeInitialized: () => {
            // console.log("onRuntimeInitialized");
        },
        postRun: [
            (This: any) => {
                debugger;
                // Note: This runs when Wasm loaded and initialized, not after program
                // executed. IS THAT TRUE?

                // Yes, I think above is true. Need to wait for obabel to finish executing. But how?
            },
        ],
    });

    obabel.then((lll: any) => {
        console.log(lll);
        debugger;
        return;
    })
    .catch((err: any) => {
        console.error(err);
        debugger;
        return;
    });
}