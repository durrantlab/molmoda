// This runs from within a webworker

import {
    sendResponseToMainThread,
    waitForDataFromMainThread,
} from "@/Core/WebWorkers/WorkerHelper";
// import { defaultFpocketParams } from "./FPocketWebTypes";

// declare let Module: any;

// (self as any)["WEBINA_Module"] = {
//     locateFile: (path: string) => {
//         return `webina/${path}`;
//     }
// }


// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// importScripts("webina/vina.min.js");

import * as WEBINA_Module from "../../../../public/js/webina/vina.min.js";

waitForDataFromMainThread()
    .then((params: any) => {
        const webinaMod = new WEBINA_Module({
            logReadFiles: true,
            noInitialRun: true,
            locateFile: (path: string) => {
                console.log(path);
                return `webina/${path}`;
            },
            preRun: [
                function (This: any) {
                    // Save the pdb file to the file system
                    This.FS.writeFile(params.pdbFiles.prot.name, params.pdbFiles.prot.contents);
                    This.FS.writeFile(params.pdbFiles.cmpd.name, params.pdbFiles.cmpd.contents);
                }
            ],
            print: (text: string) => {
                console.log(text);
            },
            printErr: (text: string) => {
                console.log(text);
            },
        })
        return Promise.all([params, webinaMod]);
    })
    .then((payload: any) => {
        const params = payload[0];
        const webinaMod = payload[1];

        return Promise.all([params, webinaMod.ready]);
    })
    .then((payload: any) => {
        const params = payload[0];
        const webinaMod = payload[1];
        
        let cmdLineParams: any[] = [];
        Object.keys(params.userArgs).forEach((key) => {
            const val = params.userArgs[key];
            if (val === false) {
                return;
            } else if (val === true) {
                cmdLineParams.push(`--${key}`);
                return;
            }
            cmdLineParams.push(`--${key}`);
            cmdLineParams.push(val);
        });

        // cmdLineParams = ["--help"]
        cmdLineParams = ['--receptor', '/receptor.pdbqt', '--ligand', '/ligand.pdbqt'];

        // console.log(cmdLineParams);

        debugger;
        webinaMod.callMain(cmdLineParams);
        
        // Webina.start(
        //     webinaParams,  // {} as IFpocketParams, // fPocketParams,
        //     params.pdbName,
        //     params.pdbContents,

        //     // onDone callback
        //     (
        //         outPdbFileTxt: string,
        //         stdOut: string,
        //         stdErr: string,
        //         infoTxt: string
        //     ) => {
        //         sendResponseToMainThread({
        //             outPdbFileTxt,
        //             stdOut,
        //             stdErr,
        //             // pocketProps: extraInfoTableData(infoTxt),
        //         });
        //     },

        //     // onError callback
        //     (errObj: any) => {
        //         sendResponseToMainThread({
        //             error: errObj["message"],
        //         });
        //     },

        //     "webina/"
        //     // Utils.curPath() + "FpocketWeb/"  // TODO: Good to implement something like this in biotite.
        // );
        return;
    })
    .catch((err: Error) => {
        debugger;
        throw err;
    });
