// import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { ITreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { dynamicImports } from "../../../Core/DynamicImports";
import { pluginsApi } from "@/Api/Plugins";
import {
    ISimpleMsg,
    PopupVariant,
} from "@/UI/Layout/Popups/InterfacesAndEnums";
import { isTest } from "@/Testing/SetupTests";

interface IErrorData {
    message: string;
    source?: string;
    lineno?: number;
    colno?: number;
    molecules?: ITreeNode[];
    errorStack: string;
}

/**
 * Setup error reporting.
 */
export function errorReportingSetup() {
    /**
     * Catch unhandled errors.
     *
     * @param {string} message  The error message.
     * @param {string} source   The source.
     * @param {number} lineno   The line number.
     * @param {number} colno    The column number.
     * @param {Error}  error    The error.
     */
    window.onerror = function (message, source, lineno, colno, error) {
        const data = {
            message: message,
            source: source,
            lineno: lineno,
            colno: colno,
            errorStack: error ? error.stack : null,
        } as IErrorData;
        sendErrorToServer(data);

        // rethrow the error (not necessary)
        // throw error;
    };

    /**
     * Catch unhandled promise rejections.
     *
     * @param {PromiseRejectionEvent} event  The event.
     */
    window.onunhandledrejection = function (event: PromiseRejectionEvent) {
        sendErrorToServer({
            message: event.reason.message,
            errorStack: event.reason.stack,
        });
    };
}

let tmpErrorMsg = "";

/**
 * Set a temporary error message. Occasionally, I can detect that an error is
 * about to come (e.g., when trying to dock a molecule that has not been
 * desaulted). It is tricky to fully catch these WASM errors, but I can control
 * the message at least.
 *
 * @param {string} msg  The message.
 */
export function setTempErrorMsg(msg: string) {
    tmpErrorMsg = "TMPERRORMSG:" + msg;
    setTimeout(() => {
        tmpErrorMsg = "";
    }, 2000);
}

/**
 * Send error data to the server if user has authorized.
 *
 * @param {IErrorData} errorData  The error data.
 */
async function sendErrorToServer(errorData: IErrorData) {
    // errorData["molecules"] = getMoleculesFromStore().serialize();

    let txt = "";

    // If there is a message, add it to the txt
    if (errorData["message"]) {
        txt += `${errorData["message"]}\n`;
    }

    // If source
    if (errorData["source"]) {
        txt += `${errorData["source"]}\n`;
    }

    // lineno, colno
    if (errorData["lineno"]) {
        txt += `Line: ${errorData["lineno"]}\n`;
    }

    if (errorData["colno"]) {
        txt += `Column: ${errorData["colno"]}\n`;
    }

    // If there is an error stack, add it to the txt
    if (errorData["errorStack"]) {
        txt += `${errorData["errorStack"]}\n`;
    }

    // If there are molecules, add them to the txt
    if (errorData["molecules"]) {
        txt += "Molecules:\n";
        for (const molecule of errorData["molecules"]) {
            txt += `${JSON.stringify(molecule, null, 4)}\n`;
        }
    }

    if (tmpErrorMsg !== "") {
        // Overwrite the error message with the temporary error message if it
        // exists.
        txt = tmpErrorMsg;
        triggerErrorPopup(txt);
    }
}

export async function reportErrorToServer(errTxt = "") {
    // Use AJAX (e.g., fetch, Axios, etc.) to send errorData to your PHP server.
    const axios = await dynamicImports.axios.module;
    await axios.post("https://durrantlab.pitt.edu/apps/molmoda/log_error.php", {
        val: errTxt,
    });
}

/**
 * Trigger an error popup.
 *
 * @param {string}  errTxt                  The error message.
 * @param {boolean} [informServer=true]     Whether to inform the server.
 * @param {boolean} [simpleErrorMsg=false]  Whether to use a simple error message.
 */
export function triggerErrorPopup(
    errTxt: string,
    informServer = true,
    simpleErrorMsg = false
) {
    if (simpleErrorMsg) errTxt = "TMPERRORMSG:" + errTxt;
    if (isTest) throw new Error(errTxt);
    pluginsApi.runPlugin("errorreporting", {
        title: "",
        message: errTxt,
        variant: PopupVariant.Danger,
        callBack: async () => {
            if (informServer) await reportErrorToServer(errTxt);
        },
    } as ISimpleMsg);
}
