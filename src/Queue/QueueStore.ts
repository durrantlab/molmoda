// I'm going to store queue information here, not in VueJS queue. It won't be
// reactive, but I like the separation, and I don't want queue information ever
// being exported in a biotite file. TODO: Perhaps reconsider this
// implementation later.

import { IJobStatusInfo, JobStatus } from "./QueueTypes";

interface IQueueStore {
    running: IJobStatusInfo[];
    done: IJobStatusInfo[];
}

const queueStore: IQueueStore = {
    running: [],
    done: [],
};

/**
 * Get a copy of the queue store.
 * 
 * @returns {IQueueStore}  A copy of the queue store.
 */
export function getQueueStore(): IQueueStore {
    // Return a copy
    return JSON.parse(JSON.stringify(queueStore));
}

/**
 * Add a new job to the queue store.
 *
 * @param {string}   id          The job ID.
 * @param {number}   nprocs      The number of processors the job will use.
 * @param {Function} cancelFunc  A function that can be called to cancel the
 *                               job.
 */
export function startInQueueStore(id: string, nprocs: number, cancelFunc: () => void) {
    queueStore.running.push({
        id: id,
        progress: 0,
        numProcessors: nprocs,
        startTime: Date.now(),
        endTime: undefined,
        status: JobStatus.Running,
        cancelFunc: cancelFunc,
    } as IJobStatusInfo);
}

/**
 * Update the progress of a job in the queue store.
 * 
 * @param {string} id        The job ID.
 * @param {number} progress  The progress of the job.
 */
export function updateProgressInQueueStore(id: string, progress: number) {
    const item = queueStore.running.find((item) => item.id === id);
    if (item) {
        item.progress = progress;
    }
}

function _moveToDoneInQueueStore(id: string, status: JobStatus) {
    const item = queueStore.running.find((item) => item.id === id);
    if (item) {
        item.endTime = Date.now();
        item.status = status;
        queueStore.done.push(item);
        queueStore.running = queueStore.running.filter(
            (item) => item.id !== id
        );
    }
}

/**
 * Mark a job as done in the queue store.
 * 
 * @param {string} id  The job ID.
 */
export function doneInQueueStore(id: string) {
    _moveToDoneInQueueStore(id, JobStatus.Done);
}

/**
 * Mark a job as cancelled in the queue store.
 * 
 * @param {string} id  The job ID.
 */
export function cancelInQueueStore(id: string) {
    // Call the cancel function
    const item = queueStore.running.find((item) => item.id === id);
    if (item) {
        item.cancelFunc();
    }

    _moveToDoneInQueueStore(id, JobStatus.Cancelled);
}