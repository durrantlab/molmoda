// import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { ITreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { dynamicImports } from "../../../Core/DynamicImports";
import { pluginsApi } from "@/Api/Plugins";

interface IErrorData {
    message: string;
    source?: string;
    lineno?: number;
    colno?: number;
    molecules?: ITreeNode[];
    errorStack: string;
}

let errorLogged = false;

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

/**
 * Send error data to the server if user has authorized.
 * 
 * @param {IErrorData} errorData  The error data.
 */
async function sendErrorToServer(errorData: IErrorData) {
    if (errorLogged) {
        return;
    }
    errorLogged = true;

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

    pluginsApi.runPlugin("errorreporting", {txt, onApprove: async () => {
        // Use AJAX (e.g., fetch, Axios, etc.) to send errorData to your PHP server.
        const axios = await dynamicImports.axios.module;
        await axios.post(
            "https://durrantlab.pitt.edu/apps/biotite/log_error.php",
            {"val": txt}
        );
    }});
}
