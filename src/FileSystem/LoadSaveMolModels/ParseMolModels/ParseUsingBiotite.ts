import { IFileInfo } from "@/FileSystem/Definitions";
import { store } from "@/Store";
import { pushToStoreList, setStoreVar } from "@/Store/StoreExternalAccess";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { ILog } from "@/UI/Panels/Log/LogUtils";
import { biotiteStateKeysToRetain } from "../Utils";
import { atomsToModels } from "./Utils";

export function parseUsingBiotite(
    fileInfo: IFileInfo
): Promise<void | IMolContainer> {
    return jsonStrToState(fileInfo.contents)
        .then((stateFromJson) => {
            // Update vueX store
            // store.replaceState(state);
            for (const key of biotiteStateKeysToRetain) {
                pushToStoreList(key, stateFromJson[key]);
            }

            fixLog();

            return undefined;
        })
        .catch((err: any) => {
            console.error(err);
            return undefined;
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
        if (an < bn) return -1;
        if (an > bn) return 1;
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
 * Converts a json representation of the state (uncompressed biotite file) to a
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

    const promises = (obj.molecules as IMolContainer[]).map((mol) =>
        atomsToModels(mol)
    );

    return Promise.all(promises).then((mols: IMolContainer[]) => {
        for (const i in mols) {
            obj.molecules[i] = mols[i];
        }
        return obj;
    });
}
