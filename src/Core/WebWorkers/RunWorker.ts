/**
 * Runs a webworker.
 *
 * @param  {Worker} worker The webworker to run.
 * @param  {any}    data   The data to send to the webworker.
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

    // Now send data to webworker.
    worker.postMessage(data);

    return returnPromise;
}
