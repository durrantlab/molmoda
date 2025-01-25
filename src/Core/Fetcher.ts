// NOTE: All requests to remote servers must pass through these functions.

import { dynamicImports } from "./DynamicImports";
import * as pluginsApi from "@/Api/Plugins";
import { delayForPopupOpenClose } from "./GlobalVars";
import { localStorageSetItem } from "./LocalStorage";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { isTest } from "@/Testing/SetupTests";

export enum ResponseType {
    JSON = "json",
    TEXT = "text",
    BLOB = "blob",
    ARRAY_BUFFER = "arraybuffer",
}

interface IFetcherOptions {
    responseType: ResponseType;
    formPostData?: any;
    cacheBust?: boolean;
}

/**
 * Fetch a file from a remote URL.
 *
 * @param {string} url  The URL of the file to fetch.
 * @param {IFetcherOptions} [options]  The options for the fetch.
 * @returns {Promise<any>} A promise that resolves the fetched file.
 */
export async function fetcher(
    url: string,
    options?: IFetcherOptions
): Promise<any> {
    // If options not specified, figure out what it should be based on the URL.
    if (options === undefined) {
        // if url ends in json, set responseType to JSON
        if (url.toLowerCase().endsWith(".json")) {
            options = {
                responseType: ResponseType.JSON,
            };
        } else {
            options = {
                responseType: ResponseType.TEXT,
            };
        }
    }

    // Determine if it is an external URL. External URLS have http:// or
    // https://, and are not local.
    const urlUpper = url.toUpperCase();
    const startsWithHttp =
        urlUpper.slice(0, 7) === "HTTP://" ||
        urlUpper.slice(0, 8) === "HTTPS://";
    const isExternal =
        startsWithHttp && !url.startsWith(window.location.origin);
    const allowExternalWebAccess = (await getSetting(
        "allowExternalWebAccess"
    )) as boolean;

    let permissionResp = "allowed"; // for internal urls (!isExternal).
    if (isExternal && !allowExternalWebAccess && !isTest) {
        permissionResp = await new Promise((resolve) => {
            // Stop the spinner
            pluginsApi.pluginsApi.runPlugin("fetcherpermission", {
                url,
                onDeny: () => {
                    setTimeout(() => {
                        resolve("denied");
                    }, delayForPopupOpenClose);
                },
                onAllow: () => {
                    setTimeout(() => {
                        resolve("allowed");
                    }, delayForPopupOpenClose);
                },
                onAllowAll: async () => {
                    // TODO: Update settings for allow all

                    localStorageSetItem("allowExternalWebAccess", true);

                    setTimeout(() => {
                        resolve("allowed");
                    }, delayForPopupOpenClose);
                },
            });
        });
    }

    if (permissionResp === "denied") {
        throw new Error("Permission denied; cannot fetch the URL.");
    }

    // If cacheBust is true, add a cache-busting query parameter to the URL.
    if (options.cacheBust) {
        const cacheBustParam = `cacheBust=${Date.now()}`;
        url = url.includes("?") ? `${url}&${cacheBustParam}` : `${url}?${cacheBustParam}`;
    }

    // Load axios
    const axios = await dynamicImports.axios.module;

    if (!options.formPostData) {
        // Fetch the file from the remote URL using axios, simple GET.
        const response = await axios.get(url, options);
        return response.data;
    } else {
        // Fetch the file from the remote URL using axios, POST.
        const response = await axios.post(url, options.formPostData, options);
        return response.data;
    }
}

type QueueItem = {
    url: string;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    startTime?: number;
};

/**
 * A queue that handles rate-limited HTTP requests using the fetcher function.
 * Ensures that requests are made at a controlled rate to prevent overwhelming
 * target servers or hitting rate limits.
 */
export class RateLimitedFetcherQueue {
    private queue: Array<QueueItem> = [];
    private completedTimes: number[] = []; // Track when requests complete
    private readonly requestsPerSecond: number;
    private readonly options: { responseType: ResponseType };
    private isProcessing = false;

    /**
     * Creates a new RateLimitedFetcherQueue instance.
     *
     * @param {number}       requestsPerSecond     Maximum number of requests
     *                                             allowed per second
     * @param {object}       options               Configuration options for the
     *                                             fetcher
     * @param {ResponseType} options.responseType  Type of response expected
     *                                             (json, text, blob, etc.)
     * @throws {Error} If requestsPerSecond is less than or equal to 0
     */
    constructor(
        requestsPerSecond: number,
        options: { responseType: ResponseType }
    ) {
        if (requestsPerSecond <= 0) {
            throw new Error("requestsPerSecond must be greater than 0");
        }
        this.requestsPerSecond = requestsPerSecond;
        this.options = options;
    }

    /**
     * Adds a URL to the fetch queue. The request will be processed according to
     * the rate limits configured for the queue.
     *
     * @param {string} url - The URL to fetch
     * @returns {Promise<any>} A promise that resolves with the fetch response
     *                        or rejects if the fetch fails
     */
    public enqueue(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.queue.push({ url, resolve, reject });
            this.processQueue();
        });
    }

    /**
     * Processes the queue while respecting rate limits. This method is called
     * automatically when new items are added to the queue.
     *
     * @private
     * @returns {Promise<void>}
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        try {
            while (this.queue.length > 0) {
                if (this.canMakeNewRequest()) {
                    const item = this.queue.shift();
                    if (!item) {
                        break;
                    }

                    // Process the request and track its completion time
                    await this.processFetchRequest(item);
                    this.completedTimes.push(Date.now());
                    // Keep only the last second's worth of completed requests
                    const oneSecondAgo = Date.now() - 1000;
                    this.completedTimes = this.completedTimes.filter(
                        (time) => time > oneSecondAgo
                    );
                } else {
                    // Wait until we can make another request
                    const oldestRequest = this.completedTimes[0];
                    const waitTime = Math.max(
                        0,
                        1000 - (Date.now() - oldestRequest)
                    );
                    await new Promise((resolve) =>
                        setTimeout(resolve, waitTime)
                    );
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Processes a single fetch request and handles its resolution or rejection.
     *
     * @private
     * @param {QueueItem} item - The queue item containing the URL and promise handlers
     * @returns {Promise<void>}
     */
    private async processFetchRequest(item: QueueItem): Promise<void> {
        try {
            const response = await fetcher(item.url, this.options);
            item.resolve(response);
        } catch (error) {
            item.reject(error);
        }
    }

    /**
     * Checks if a new request can be made based on the configured rate limit.
     * Takes into account the number of requests completed in the last second.
     *
     * @private
     * @returns {boolean} True if a new request can be made, false otherwise
     */
    private canMakeNewRequest(): boolean {
        const now = Date.now();
        const oneSecondAgo = now - 1000;

        // Clean up old completion times
        this.completedTimes = this.completedTimes.filter(
            (time) => time > oneSecondAgo
        );

        // Check if we're under the rate limit
        return this.completedTimes.length < this.requestsPerSecond;
    }

    /**
     * Gets the current number of items waiting in the queue.
     *
     * @returns {number} The number of queued items
     */
    public get length(): number {
        return this.queue.length;
    }

    /**
     * Clears all pending requests from the queue and resets the completion times.
     * Active requests will still complete but no new requests will be processed
     * until new items are enqueued.
     */
    public clear(): void {
        this.queue = [];
        this.completedTimes = [];
    }
}
