/**
 * Get a URL parameter by name.
 *
 * @param {string}      param                The name of the parameter to get.
 * @param {string|null} [defaultValue=null]  The default value to return if the
 *                                           parameter is not found.
 * @returns {string|null}  The value of the parameter, or the default value if
 *     the parameter is not found.
 */
export function getUrlParam(
    param: string,
    defaultValue: string | null = null
): string | null {
    if (typeof window === "undefined") {
        // In webworker, always just return default.
        return defaultValue;
    }

    // First, try to get any programmatic params (inserted by php wrapper).
    const programaticParams = (window as any).MOLMODA_PARAMS;
    if (
        programaticParams !== undefined &&
        programaticParams[param] !== undefined
    ) {
        return programaticParams[param];
    }

    // If all else fails, try to get it from the url (?&) params.
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param) || defaultValue;
}
