import type { FileInfo } from "@/FileSystem/FileInfo";
import { store } from "@/Store";
import { pushToStoreList, setStoreVar } from "@/Store/StoreExternalAccess";
import { treeNodeListDeserialize } from "@/TreeNodes/Deserializers";
import type { ITreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import type { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import type { ILog } from "@/UI/Panels/Log/LogUtils";

export const molmodaStateKeysToRetain = ["molecules", "log"];

/**
 * Uses molmoda to parse the a molecular-model file. For molmoda-native files.
 *
 * @param  {FileInfo} fileInfo  The file to parse.
 * @returns {Promise<void | TreeNodeList>}  A promise that resolves when the file is
 *    parsed. The promise resolves to a TreeNodeList containing the frames. Can also
 *    resolve void.
 */
export function parseUsingMolModa(
    fileInfo: FileInfo
): Promise<void | TreeNodeList> {
    return jsonStrToState(fileInfo.contents)
        .then((stateFromJson) => {
            // Update vueX store
            for (const key of molmodaStateKeysToRetain) {
                switch (key) {
                    case "log":
                        pushToStoreList(key, stateFromJson[key]);
                        break;
                    case "molecules":
                        (stateFromJson[key] as TreeNodeList).addToMainTree();
                        break;
                }
            }

            fixLog();

            return undefined;
        })
        .catch((err: any) => {
            throw err;
        });
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
function jsonStrToState(jsonStr: string): Promise<any> {
    // Viewer needs to reload everything, so set viewierDirty to true in all
    // cases. This is a little hackish, but easier than recursing I think.
    jsonStr = jsonStr.replace(/"viewerDirty": *false/g, '"viewerDirty":true');

    // Now convert it to an object.
    const obj = JSON.parse(jsonStr);

    return treeNodeListDeserialize(obj.molecules as ITreeNode[])
        .then((mols: TreeNodeList) => {
            obj.molecules = mols;
            return obj;
        })
        .catch((err: any) => {
            throw err;
        });
}