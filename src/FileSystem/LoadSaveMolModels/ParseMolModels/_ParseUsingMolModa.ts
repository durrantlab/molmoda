import { visualizationApi } from "@/Api/Visualization";
import { waitForCondition } from "@/Core/Utils/MiscUtils";
import type { FileInfo } from "@/FileSystem/FileInfo";
import { store } from "@/Store";
import { pushToStoreList, setStoreVar } from "@/Store/StoreExternalAccess";
import { treeNodeListDeserialize } from "@/TreeNodes/Deserializers";
import type { ITreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import type { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import type { ILog } from "@/UI/Panels/Log/LogUtils";
import { ViewerParent } from "@/UI/Panels/Viewer/Viewers/ViewerParent";
import { replaceAllCustomStyles } from "@/Core/Styling/StyleManager";
import { goldenLayout } from "@/UI/Layout/GoldenLayout/GoldenLayoutCommon";
import { layoutApi } from "@/Api/Layout";
import { sanitizeHtml } from "@/Core/Security/Sanitize";
import { isMobile } from "@/Core/GlobalVars";
export const molmodaStateKeysToRetain = [
    "molecules",
    "log",
    "goldenLayout",
    "viewerVantagePoint",
    "projectTitle",
];

/**
 * Uses molmoda to parse the a molecular-model file. For molmoda-native files.
 *
 * @param  {FileInfo} fileInfo  The file to parse.
 * @returns {Promise<void | TreeNodeList>}  A promise that resolves when the file is
 *    parsed. The promise resolves to a TreeNodeList containing the frames. Can also
 *    resolve void.
 */
export async function parseUsingMolModa(
    fileInfo: FileInfo
): Promise<void | TreeNodeList> {
    const stateFromJson = await jsonStrToState(fileInfo.contents);
    // Update vueX store
    for (const key of molmodaStateKeysToRetain) {
        let viewer: ViewerParent;

        let sanitizedLog: any = null;
        if (key === "log") {
            sanitizedLog = (stateFromJson[key] as ILog[]).map(
                async (logEntry) => ({
                    ...logEntry,
                    message: await sanitizeHtml(logEntry.message),
                    parameters: await sanitizeHtml(logEntry.parameters),
                })
            );
            sanitizedLog = await Promise.all(sanitizedLog);
        }

        switch (key) {
            case "log":
                pushToStoreList(key, sanitizedLog);
                break;
            case "molecules":
                (stateFromJson[key] as TreeNodeList).addToMainTree(
                    null,
                    false,
                    true,
                    false
                );
                break;
            case "goldenLayout":
                if (isMobile) {
                    break;
                }
                if (stateFromJson[key]) {
                    setStoreVar("goldenLayout", stateFromJson[key]);
                    if (goldenLayout) {
                        layoutApi.setSessionLayoutActive(true); // Activate session layout mode
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        goldenLayout.loadLayout(stateFromJson[key]);
                    } else {
                        console.warn(
                            "GoldenLayout object not available to load layout state."
                        );
                    }
                }
                break;
            case "viewerVantagePoint":
                setStoreVar("viewerVantagePoint", stateFromJson[key]);
                viewer = await visualizationApi.viewer;

                // TODO: Below is hackish. Only works if 3dmoljs is the viewer.
                // That is the only option for now, but it might change in the
                // future.
                await waitForCondition(() => {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    return viewer._mol3dObj !== undefined;
                });
                viewer.setView(stateFromJson[key]);
                break;
            case "projectTitle":
                setStoreVar("projectTitle", stateFromJson[key] || "");
                break;
        }
    }
    // Load custom styles if present
    if (stateFromJson["customSelsAndStyles"]) {
        replaceAllCustomStyles(stateFromJson["customSelsAndStyles"]);
    }
    fixLog();

    return undefined;
}

/**
 * Sorts logs by timestamp and removes duplicates.
 */
function fixLog() {
    // Need to sort the log, make sure no duplicate keys
    let log = store.state["log"];

    // Sort by timestampSecs
    log = log.sort((a: ILog, b: ILog) => {
        const an = a.timestampSecs as number;
        const bn = b.timestampSecs as number;
        if (an < bn) {
            return -1;
        }
        if (an > bn) {
            return 1;
        }
        return 0;
    });

    // Remove duplicates. Let's consider timestampSecs + message +
    // parameters + jobId to be unique key.
    const newLog: ILog[] = [];
    const keysSeen: Set<string> = new Set([]);
    for (const logItem of log) {
        const key = [
            logItem.timestampSecs.toString(),
            logItem.message,
            logItem.parameters,
            logItem.jobId,
        ].join("-");
        if (!keysSeen.has(key)) {
            newLog.push(logItem);
            keysSeen.add(key);
        }
    }

    setStoreVar("log", newLog);
}

/**
 * Converts a json representation of the state (uncompressed molmoda file) to a
 * state object.
 *
 * @param  {string} jsonStr  The json string.
 * @returns {Promise<any>} A promise that resolves the state object.
 */
async function jsonStrToState(jsonStr: string): Promise<any> {
    // Viewer needs to reload everything, so set viewierDirty to true in all
    // cases. This is a little hackish, but easier than recursing I think.
    jsonStr = jsonStr.replace(/"viewerDirty": *false/g, '"viewerDirty":true');
    // Now convert it to an object.
    const obj = JSON.parse(jsonStr);

    /**
     * Recursively sanitizes titles in the object.
     *
     * @param {any} currentObj  The current object to sanitize.
     * @returns {Promise<void>}  A promise that resolves when the sanitization is complete
     */
    const sanitizeTitles = async function (currentObj: any) {
        if (!currentObj || typeof currentObj !== "object") {
            return;
        }
        if (Array.isArray(currentObj)) {
            currentObj.forEach(sanitizeTitles);
        } else {
            if (typeof currentObj.title === "string") {
                currentObj.title = await sanitizeHtml(currentObj.title);
            }
            if (currentObj.nodes) {
                await sanitizeTitles(currentObj.nodes);
            }
        }
    };
    if (obj.molecules) {
        await sanitizeTitles(obj.molecules);
    }
    return treeNodeListDeserialize(obj.molecules as ITreeNode[])
        .then((mols: TreeNodeList) => {
            obj.molecules = mols;
            return obj;
        })
        .catch((err: any) => {
            throw err;
        });
}
