/* eslint-disable @typescript-eslint/ban-types */

import { registerJobType } from "@/JobQueue"

// Arrays of functions to call.
export const allHooks = {
    onMoleculesChanged: [] as Function[]
}

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
    },

    /**
     * Adds a function to the onMoleculesChanged hook.
     * 
     * @param  {Function} func  The function to add.
     */
    onMoleculesChanged(func: Function) {
        allHooks.onMoleculesChanged.push(func);
    }
}
