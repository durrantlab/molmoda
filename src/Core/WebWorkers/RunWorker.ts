/* eslint-disable */

export function runWorker(worker: Worker, data: any): Promise<any> {
    // Promise to wait for webworker to return data.
    const returnPromise = new Promise((resolve, reject) => {
        worker.onmessage = (resp: MessageEvent) => {
          resolve(resp.data);
        };
    });

    // Now send data to webworker.
    worker.postMessage(data);

    return returnPromise;
}