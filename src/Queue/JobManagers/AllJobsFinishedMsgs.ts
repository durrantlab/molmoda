import { messagesApi } from "@/Api/Messages";
import { IJobStatusInfo, JobStatus } from "../Types/TypesEndpointResponse";

let _msgs: string[] = [];

/**
 * Adds a message to show after all jobs are done.
 * 
 * @param  {string} msg  The message to show.
 */
export function addOnJobsDoneMsgs(msg: string) {
    _msgs.push(msg);
}

/**
 * Checks if all jobs are done.
 *
 * @param  {IJobStatusInfo[]} jobStatuses  The job statuses to check.
 * @returns {boolean}  True if all jobs are done, false otherwise.
 */
function _checkAllJobsDone(jobStatuses: IJobStatusInfo[]): boolean {
    for (const jobStatus of jobStatuses) {
        if (jobStatus.status === JobStatus.Running) {
            return false;
        }
        if (jobStatus.status === JobStatus.Pending) {
            return false;
        }
       
    }
    return true;
}

export function checkAllJobsFinishedMsgs(jobStatuses: IJobStatusInfo[]): void {
    if (_msgs.length === 0) {
        // No messages to display
        return;
    }
    if (!_checkAllJobsDone(jobStatuses)) {
        // Jobs are still running or in the queue
        return;
    }

    // Remove duplicate messages
    _msgs = _msgs.filter((msg, index, self) => {
        return self.indexOf(msg) === index;
    });

    // Sort the messages
    _msgs.sort();

    messagesApi.popupMessage("Job(s) Finished", "<p>" + _msgs.join("</p><p>" + "</p>"));

    // Clear the messages
    _msgs = [];
}
