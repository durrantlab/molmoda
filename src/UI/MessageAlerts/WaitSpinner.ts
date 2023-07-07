let body: any;

let timeoutId: any = undefined;

/**
 * If a timeout was previous set to automatically remove the spinner, cancel it.
 */
function stopPreviousTimeout() {
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
    }
}

let waitSpinnerDepth = 0;

/**
 * Start or stop the wait spinner.
 * 
 * @param  {boolean} show             Whether to show the spinner.
 * @param  {number}  [timeOut=30000]  The time to wait before hiding the
 *                                    spinner automtically.
 */
export function waitSpinner(show: boolean, timeOut = 30000) {
    if (body === undefined) {
        body = document.getElementsByTagName("body")[0];
    }

    const origWaitSpinnerDepth = waitSpinnerDepth;
    waitSpinnerDepth += show ? 1 : -1;

    waitSpinnerDepth = Math.max(waitSpinnerDepth, 0)

    if (origWaitSpinnerDepth === 0 && waitSpinnerDepth > 0) {
        // We are starting the spinner
        body.classList.add("waiting");
        stopPreviousTimeout();
        timeoutId = setTimeout(() => {
            waitSpinnerDepth = 0;
            waitSpinner(false, 0);
        }, timeOut);
    } else if (origWaitSpinnerDepth > 0 && waitSpinnerDepth === 0) {
        // We are stopping the spinner
        body.classList.remove("waiting");
        stopPreviousTimeout();
    }    
}
