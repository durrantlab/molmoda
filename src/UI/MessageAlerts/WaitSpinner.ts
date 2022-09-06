const body = document.getElementsByTagName("body")[0];
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

/**
 * Start or stop the wait spinner.
 * @param  {boolean} show             Whether to show the spinner.
 * @param  {number}  [timeOut=30000]  The time to wait before hiding the
 *                                    spinner automtically.
 */
export function waitSpinner(show: boolean, timeOut = 30000) {
    if (show) {
        body.classList.add("waiting");
        stopPreviousTimeout();
        timeoutId = setTimeout(() => {
            waitSpinner(false, 0);
        }, timeOut);
    } else {
        body.classList.remove("waiting");
        stopPreviousTimeout();
    }
}
