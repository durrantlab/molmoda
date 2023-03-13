import type { IFileInfo } from "@/FileSystem/Types";

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

    // Now send data to webworker.
    worker.postMessage(data);

    return returnPromise;
}
