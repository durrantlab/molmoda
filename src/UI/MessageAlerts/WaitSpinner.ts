const spinnerMotives: { [key: string]: NodeJS.Timeout } = {};
let _body: any;

/**
 * Returns the body element.
 *
 * @returns {HTMLBodyElement}  The body element.
 */
function _getBody(): HTMLBodyElement {
    if (_body === undefined) {
        _body = document.getElementsByTagName("body")[0];
    }
    return _body;
}

/**
 * Lists all wait spinners for debugging.
 */
// export function listWaitSpinnersForDebug() {
//     console.log(spinnerMotives);
// }

/**
 * Stops a wait spinner.
 *
 * @param {string} id  The id of the spinner.
 */
export function stopWaitSpinner(id: string) {
    if (spinnerMotives[id]) {
        clearTimeout(spinnerMotives[id]);
        delete spinnerMotives[id];
    }

    if (Object.keys(spinnerMotives).length === 0) {
        // We are stopping the spinner
        const body = _getBody();
        body.classList.remove("waiting");
    }
}

/**
 * Stops all wait spinners.
 */
export function stopAllWaitSpinners() {
    for (const id in spinnerMotives) {
        stopWaitSpinner(id);
    }
}

/**
 * Starts a wait spinner. Returns an id that can be used to stop the spinner.
 *
 * @param {number} [timeOut=30000]  The timeout in milliseconds.
 * @returns {string}  The id of the spinner.
 */
export function startWaitSpinner(timeOut = 30000): string {
    // console.trace("startWaitSpinner");

    // We are starting the spinner
    const body = _getBody();
    body.classList.add("waiting");

    // Keep track of the spinner
    const id = Math.random().toString(36).substring(2);
    spinnerMotives[id] = setTimeout(() => {
        // Stop after a timeout. Just to make sure spinners never keep going
        // indefinitely.
        stopWaitSpinner(id);
    }, timeOut);

    return id;
}
