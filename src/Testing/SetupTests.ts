import { addVueXStoreModule, store } from "@/Store";
import { setStoreVar } from "@/Store/StoreExternalAccess";

export let pluginToTest = "";

export function setupTests() {
    // Get test from url
    const urlParams = new URLSearchParams(window.location.search);
    const name = urlParams.get("test");
    if (name === null) {
        // You're not running a test
        return;
    }

    pluginToTest = name;

    // See https://www.tutorialspoint.com/How-to-catch-all-JavaScript-errors
    window.onerror = function (msg, url, line) {
        const e = msg + "\n" + url + "\n" + "Line " + line;
        setStoreVar("error", e, "test");
    };

    addVueXStoreModule("test", {
        instructions: "",
        error: "",
    });

    /* It's a test to see if the error handler works. */
    // setTimeout(() => {
    //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //     // @ts-ignore
    //     sdfdsfdsf;
    // }, 5000);
}
