import type { IFileInfo } from "@/FileSystem/Types";
import { toRaw, isReactive } from "vue";

/**
 * Runs a webworker.
 *
 * @param  {Worker}  worker                The webworker to run.
 * @param  {any}     data                  The data to send to the webworker.
 * @param  {boolean} [autoTerminate=true]  Whether to terminate the webworker
 *                                         after use. Defaults to true.
 * @returns {Promise<any>}  A promise that resolves the data that the webworker
 *     returns.
 */
export function runWorker(
    worker: Worker,
    data: any,
    autoTerminate = true
): Promise<any> {
    // Promise to wait for webworker to return data.
    const returnPromise = new Promise((resolve) => {
        // Remove previous onmessage, if any
        worker.onmessage = null;

        worker.onmessage = (resp: MessageEvent) => {
            if (autoTerminate) {
                // terminate the worker after use.
                worker.terminate();
            }
            resolve(resp.data);
        };
    });

    // Make sure all input files do not have a treenode assigned, which isn't
    // necessary and isn't serializable without explicitly serializing.

    if (data.inputFiles) {
        data.inputFiles = data.inputFiles.map((file: IFileInfo) => {
            file.treeNode = undefined;
            return file;
        });
    }

    // Go through each of the items in data. If it's reactive, make it raw.
    // This is necessary because the webworker can't handle reactive objects.
    for (const key in data) {
        const element = data[key];
        if (isReactive(element)) {
            data[key] = toRaw(element);
        }
    }

    // Now send data to webworker.
    try {
        worker.postMessage(data);
    } catch (err) {
        debugger;
        console.log(data);
        console.error(err);
        console.error("NOTE: perhaps the data couldn't be serialized. For example, did you remove all treenodes?");
        throw err;
    }

    return returnPromise;
}
