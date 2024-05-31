import { addVueXStoreModule } from "@/Store";
import { getMoleculesFromStore, setStoreVar } from "@/Store/StoreExternalAccess";
import { setPluginToTest } from "./PluginToTest";
import { getUrlParam } from "@/Core/UrlParams";

export let isTest = false;

/**
 * If running a selenium test, this function will set things up.
 */
export function setupTests() {
    // Get test from url
    const name = getUrlParam("test");

    if (name === null) {
        // You're not running a test
        return;
    }

    isTest = true;

    const idx = getUrlParam("index");

    setPluginToTest(name, idx === null ? undefined : parseInt(idx, 10));

    /**
     * Detects any javascript errors and logs them. Selenium can read these. See
     * https://www.tutorialspoint.com/How-to-catch-all-JavaScript-errors
     *
     * @param  {string | Event}     msg   The error message.
     * @param  {string | undefined} url   The url of the error.
     * @param  {number | undefined} line  The line number of the error.
     */
    window.onerror = function (
        msg: string | Event,
        url: string | undefined,
        line: number | undefined
    ) {
        const e = msg + "\n" + url + "\n" + "Line " + line?.toString();
        setStoreVar("error", e, "test");
    };

    addVueXStoreModule("test", {
        cmds: "",
        error: "",
        msgs: "",
    });

    /* It's a test to see if the error handler works. */
    // setTimeout(() => {
    //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //     // @ts-ignore
    //     sdfdsfdsf;
    // }, 5000);
}

/**
 * Expands the navigator tree so all molecules are visible. Easier to test.
 */
export function expandAndShowAllMolsInTree() {
    // Get all molecules.
    setTimeout(() => {
        getMoleculesFromStore().flattened.forEach((mol) => {
            mol.treeExpanded = true;
            mol.visible = true;
        });
    }, 500);
}