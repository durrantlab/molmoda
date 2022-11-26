/* eslint-disable @typescript-eslint/ban-types */

import { IToEndpointPayload } from "../Types/TypesToEndpoint";
import { InBrowserEndpoint } from "../InBrowserEndpoint/InBrowserEndpoint";
import { JobManagerParent } from "./JobManagerParent";
import { IEndpointResponse } from "../Types/TypesEndpointResponse";

let inBrowserEndpoint: InBrowserEndpoint | undefined;

/**
 * JobManagerForLocalQueue
 */
export class JobManagerForInBrowserEndpoint extends JobManagerParent {
    jobManagerName = "Local (In Browser) Queue";

    /**
     * Runs when job manager is created. Children can override. Use this instead
     * of the constructor.
     */
    onCreated() {
        inBrowserEndpoint = new InBrowserEndpoint();
        return;
    }

    /**
     * Sends an API request to the endpoint.
     *
     * @param  {IToEndpointPayload} payload  The payload to send.
     * @returns {Promise<IEndpointResponse>}  A promise that resolves
     *     with the response.
     */
    sendRequest(payload: IToEndpointPayload): Promise<IEndpointResponse> {
        const endPt = inBrowserEndpoint as InBrowserEndpoint;
        return endPt.processApiRequest(payload) as Promise<IEndpointResponse>;
    }
}
