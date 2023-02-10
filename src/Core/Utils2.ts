import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";

// Distinct from Utils.ts to avoid circular dependency.

// Given a list of anything and a batch size, return a list of lists of
// batch size.
export function batchify<T>(lst: T[], numBatches?: number | null): T[][] {
    // If batchSize is not specified, use number of available processors
    if (numBatches === undefined || numBatches === null) {
        numBatches = getSetting("maxProcs") as number;
    }
    const batchSize = Math.ceil(lst.length / numBatches);
    
    const batches: T[][] = [];
    for (let i = 0; i < lst.length; i += batchSize) {
        batches.push(lst.slice(i, i + batchSize));
    }
    return batches;
}