/* eslint-disable @typescript-eslint/ban-types */

import { registerJobType } from "@/JobQueue"

export const hooksApi = {
    onJobQueueCommand(command: string, func: Function) {
        registerJobType(command, func);
    }
}
