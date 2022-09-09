export interface ILog {
    timestamp: string;
    message: string;
    parameters: string;
    jobId: string;
}

/**
 * Given parameters, generates a description for the log.
 *
 * @param {any} params  The parameters to describe.
 * @returns {string}  A description of the parameters.
 */
export function describeParameters(params: any): string {
    // If the parameters are undefined, return an empty string.
    if (params === undefined) {
        return "";
    }

    // If the parameters are a string, return it.
    if (typeof params === "string") {
        if (params.length > 30) {
            // Make sure very long strings never displayed.
            params = params.substring(0, 30) + "...";
        }
        return params;
    }

    // If the parameters are an array, return a string describing the array.
    if (Array.isArray(params)) {
        if (params.length === 1) {
            // Only one item.
            params = params[0];
        } else {
            // Multiple items.
            let txt = "";
            for (let i = 0; i < params.length; i++) {
                txt += describeParameters(params[i]);
                if (i < params.length - 1) {
                    txt += "<br />";
                }
            }
            return txt;
        }
    }
    
    // It's just an object.
    const keys = Object.keys(params);
    keys.sort();
    let txt = "";
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const val = params[key];
        let paramDesc = describeParameters(val);

        // Does paramDesc not represent a number? If so, put it in quotes.
        if (!paramDesc.match(/^-?\d+(\.\d+)?$/)) {
            paramDesc = `"${paramDesc}"`;
        }

        txt += `--${key} ${paramDesc}`;
        if (i < keys.length - 1) {
            txt += " ";
        }
    }
    return txt;
}