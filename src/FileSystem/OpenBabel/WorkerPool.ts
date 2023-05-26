// This is for managing groups of workers performing the same task (e.g.,
// OpenBabel mass conversions). If there's a chance you'll ever be doing a
// calculate through a remote server, use the Queue system, not this system.
// TODO: Can these two systems be unified somehow?

import { randomID } from "@/Core/Utils";
import { batchify } from "@/Core/Utils2";
import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";

interface IWorkerInfo {
    id: string;
    worker: Worker;
    isFree: boolean;
}

/**
 * A class for managing a pool of workers that perform the same task.
 */
export class WorkerPool {
    private workerPool: IWorkerInfo[] = [];
    private nprocs: number;
    private workerFactoryFunc: () => Worker;

    /**
     * Create a new worker pool.
     *
     * @param {Function} workerFactoryFunc  A function that returns a new
     *                                      worker.
     * @param {number}   maxProcs           The maximum number of workers to run
     *                                      at once.
     */
    constructor(workerFactoryFunc: () => Worker, maxProcs = 1) {
        this.nprocs = maxProcs;
        this.workerFactoryFunc = workerFactoryFunc;
    }

    /**
     * Get an available worker from the pool.
     *
     * @returns {IWorkerInfo | undefined}  The worker info or undefined if no
     *                                     workers are available.
     */
    private _getAvailableWorker(): IWorkerInfo | undefined {
        for (const workerInfo of this.workerPool) {
            if (workerInfo.isFree) {
                return workerInfo;
            }
        }
        return undefined;
    }

    /**
     * Adjust the number of workers in the pool to match the number of workers
     * that should be running.
     */
    private _expandOrContractPool() {
        // Get the number of open babel workers that should be running.
        this.nprocs = getSetting("maxProcs");

        // Termiante and remove workers that are no longer needed.
        while (this.workerPool.length > this.nprocs) {
            const workerInfo = this.workerPool.pop();
            if (workerInfo) {
                workerInfo.worker.terminate();
            }
        }

        // Create new workers if needed.
        while (this.workerPool.length < this.nprocs) {
            const worker = this.workerFactoryFunc();
            this.workerPool.push({
                id: randomID(),
                worker: worker,
                isFree: true,
            });
        }
    }

    /**
     * Run jobs on the workers.
     *
     * @param {any[]}  payloads      The payloads to send to the workers that
     *                               describe the jobs.
     * @param {number} [maxProcs=1]  The maximum number of workers to run at
     *                               once.
     * @returns {Promise<any>}  A promise that resolves to the results of the
     *                          jobs.
     */
    public runJobs(payloads: any[], maxProcs = 1): Promise<any> {
        this.nprocs = maxProcs;
        this._expandOrContractPool();

        // Divide the inputFiles between the workers.
        const payloadsPerWorkerBatches = batchify(payloads, this.nprocs);

        const promises: Promise<any>[] = [];
        for (const payloadPerWorker of payloadsPerWorkerBatches) {
            const workerInfo = this._getAvailableWorker();
            
            if (workerInfo === undefined) {
                alert("Prob! No workers available!");
                // TODO: Need to use timeout here.
                return Promise.resolve(null);
            }
            
            workerInfo.isFree = false;

            const prom1 = runWorker(
                workerInfo.worker,
                payloadPerWorker,
                false // don't auto terminate the worker.
            );
            const prom2 = Promise.resolve(workerInfo.id);

            promises.push(Promise.all([prom1, prom2]));
        }

        return Promise.all(promises)
            .then((payloads: any[][]) => {
                const results = payloads.map(p => p[0]);
                const workerIDs = payloads.map(p => p[1]);

                // Mark the workers as free.
                for (const workerID of workerIDs) {
                    const workerInfo = this.workerPool.find(w => w.id === workerID);
                    if (workerInfo) {
                        workerInfo.isFree = true;
                    }
                }

                // Flatten the results.
                return results.flat();
            })
            .catch((e: any) => {
                throw e;
            });
    }

}
