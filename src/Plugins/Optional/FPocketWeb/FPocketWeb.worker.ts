// This runs from within a webworker

import {
    sendResponseToMainThread,
    waitForDataFromMainThread,
} from "@/Core/WebWorkers/WorkerHelper";
import { defaultFpocketParams } from "./FPocketWebTypes";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
importScripts("fpocketweb/FpocketWeb.min.js");

waitForDataFromMainThread()
    .then((params: any) => {
        const fPocketParams = defaultFpocketParams;
        FpocketWeb.start(
            {} as IFpocketParams, // fPocketParams,
            params.pdbName,
            params.pdbContents,

            // onDone
            (
                outPdbFileTxt: string,
                stdOut: string,
                stdErr: string,
                pocketsContents: string
            ) => {
                sendResponseToMainThread({
                    outPdbFileTxt,
                    stdOut,
                    stdErr,
                    pocketsContents,
                });
            },

            // onError
            (errObj: any) => {
                alert(errObj["message"]);
                // this.showFpocketWebError(errObj["message"]);
            },

            "fpocketweb/"
            // Utils.curPath() + "FpocketWeb/"  // TODO: Good to implement something like this in biotite.
        );
        return;
    })
    .catch((err: Error) => {
        throw err;
    });
