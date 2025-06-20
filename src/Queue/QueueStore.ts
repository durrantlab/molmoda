// I'm going to store queue information here, not in VueJS queue. It won't be
// reactive, but I like the separation, and I don't want queue information ever
// being exported in a molmoda file. TODO: Perhaps reconsider this
// implementation later.

import { showSystemNotification } from "@/UI/MessageAlerts/SystemNotifications";
import { IJobStatusInfo, JobStatus } from "./QueueTypes";
import { appName } from "@/Core/GlobalVars";
import { capitalize } from "@/Core/Utils/StringUtils";
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
export function startInQueueStore(
    id: string,
    nprocs: number,
    cancelFunc: () => void
) {
    queueStore.running.push({
        id: id,
        progress: 0,
        numProcessors: nprocs,
        startTime: Date.now() + Math.random(), // To make sure unique.
        endTime: undefined,
        status: JobStatus.Running,
        cancelFunc: cancelFunc,
    } as IJobStatusInfo);
}

/**
 * Update the progress of a job in the queue store.
 *
 * @param {string} id        The job ID.
 * @param {number}             progress  The progress of the job.
 */
export function updateProgressInQueueStore(id: string, progress: number) {
    if (id === undefined) {
        return;
    }
    const item = queueStore.running.find((item) => item.id === id);
    if (item) {
        item.progress = progress;
    }
}

/**
 * Move a job from the running queue to the done queue.
 *
 * @param {string} id  The job ID.
 * @param {JobStatus} status  The status of the job.
 */
function _moveToDoneInQueueStore(id: string, status: JobStatus) {
    const item = queueStore.running.find((item) => item.id === id);
    if (item) {
        item.endTime = Date.now();
        item.status = status;
        queueStore.done.push(item);
        queueStore.running = queueStore.running.filter(
            (item) => item.id !== id
        );
        // Show system notification when a job finishes, but only if not focused.
        if (!document.hasFocus()) {
            const jobType = item.id.split("-")[0];
            const statusText =
                status === JobStatus.Done ? "finished" : "cancelled";
            const title = `${appName} Job Done: ${capitalize(jobType)}`;
            const body = `The "${jobType}" job has ${statusText}.`;
            showSystemNotification(title, body);
        }
    }
}
/**
 * Mark a job as done in the queue store.
 *
 * @param {string} id  The job ID.
 */
export function doneInQueueStore(id: string) {
    if (id !== undefined) {
        _moveToDoneInQueueStore(id, JobStatus.Done);
    }
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

/**
 * Make a job Id unique.
 *
 * @param {string} id  The job ID.
 * @returns {string}  The unique job ID.
 */
export function makeUniqJobId(id: string) {
    return id + "-" + Math.round(Math.random() * 1000000).toString();
}
