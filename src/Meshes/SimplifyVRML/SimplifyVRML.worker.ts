/**
 * Web worker entry point for mesh simplification operations.
 * Handles VRML processing and mesh optimization through vertex clustering
 * and distance-based merging techniques.
 */

import { processVRML } from './ProcessVRML';

interface WorkerRequest {
    vrmlContent: string;
    mergeCutoff: number;
    reductionFraction: number;
    id: string;
}

interface WorkerResponse {
    success: boolean;
    optimizedVRML?: string;
    error?: string;
    id: string;
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
    try {
        const { vrmlContent, mergeCutoff, reductionFraction, id } = e.data;
        const result = await processVRML(vrmlContent, mergeCutoff, reductionFraction);
        const response: WorkerResponse = {
            success: true,
            optimizedVRML: result,
            id: id
        };
        self.postMessage(response);
    } catch (error) {
        const response: WorkerResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            id: "???"
        };
        self.postMessage(response);
    }
};