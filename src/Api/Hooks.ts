/* eslint-disable @typescript-eslint/ban-types */

import { registerJobType } from "@/JobQueue"

export const hooksApi = {
    /**
     * Tells the queue system about a given job type.
     *
     * @param {string}   command  The commannd name.
     * @param {Function} func     The function to run when that command is
     *                            encountered in the queue system.
     */
    onJobQueueCommand(command: string, func: Function): void {
        registerJobType(command, func);
    }
}
