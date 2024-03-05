// This runs from within a webworker

import {
    sendResponseToMainThread,
    waitForDataFromMainThread,
} from "@/Core/WebWorkers/WorkerHelper";
// import { defaultFpocketParams } from "./FPocketWebTypes";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
importScripts("fpocketweb/FpocketWeb.min.js");

/**
 * Helper function to convert a field from fpocket output to a number.
 *
 * @param  {string} s  The string to convert
 * @returns {number}  The number
 */
function numConvert(s: string): number {
    return parseFloat(s.split(":")[1].replace("\t", "").trim());
}

/**
 * Helper function to convert fpocket output to a table format.
 *
 * @param  {string} infoTxt  The fpocket output.
 * @returns {any[]}  The table data.
 */
function extraInfoTableData(infoTxt: string): any[] {
    const data = infoTxt.split("\n\n");
    const items = [];
    for (let i = 0; i < data.length; i++) {
        const tmp = data[i].split("\n");
        if (tmp.length > 1) {
            items.push({
                // 'pocket': i + 1,  // Leave lower case
                Score: numConvert(tmp[1]),
                Druggability: numConvert(tmp[2]),
                "Alpha Spheres": numConvert(tmp[3]),
                "Total SASA": numConvert(tmp[4]),
                "Polar SASA": numConvert(tmp[5]),
                "Apolar SASA": numConvert(tmp[6]),
                Volume: numConvert(tmp[7]),
                "Mean Local Hydrophobic Density": numConvert(tmp[8]),
                "Mean Alpha Sphere Radius": numConvert(tmp[9]),
                "Mean Alpha Sphere Solvent Access": numConvert(tmp[10]),
                "Apolar Alpha Sphere Proportion": numConvert(tmp[11]),
                "Hydrophobicity Score": numConvert(tmp[12]),
                "Volume Score": numConvert(tmp[13]),
                "Polarity Score": numConvert(tmp[14]),
                "Charge Score": numConvert(tmp[15]),
                "Proportion of Polar Atoms": numConvert(tmp[16]),
                "Alpha Sphere Density": numConvert(tmp[17]),
                "Center of Mass, Alpha Sphere Max Distance": numConvert(
                    tmp[18]
                ),
                Flexibility: numConvert(tmp[19]),
            });
        }
    }
    return items;
}

waitForDataFromMainThread()
    .then((paramsBatch: any[]) => {
        const responsePromises: Promise<any>[] = [];

        for (const params of paramsBatch) {
            const fPocketParams = params.userArgs;

            // TODO: You've received a batch of fpocket parameters, but you're
            // creating a new fpocket object for each one. Would be good to
            // reuse existing object for slight speedup.

            responsePromises.push(
                new Promise((resolve) => {
                    FpocketWeb.start(
                        fPocketParams, // {} as IFpocketParams, // fPocketParams,
                        params.pdbName,
                        params.pdbContents,

                        // onDone callback
                        (
                            outPdbFileTxt: string,
                            stdOut: string,
                            stdErr: string,
                            infoTxt: string
                        ) => {
                            resolve({
                                outPdbFileTxt,
                                stdOut,
                                stdErr,
                                pocketProps: extraInfoTableData(infoTxt),
                            });
                        },

                        // onError callback
                        (errObj: any) => {
                            resolve({
                                error: errObj["message"],
                            });
                        },

                        "fpocketweb/"
                        // Utils.curPath() + "FpocketWeb/"  // TODO: Good to implement something like this in molmoda.
                    );
                })
            );
        }

        return Promise.all(responsePromises);
    })
    .then((responses: any[]) => {
        sendResponseToMainThread(responses);
        return;
    })
    .catch((err: Error) => {
        throw err;
    });
