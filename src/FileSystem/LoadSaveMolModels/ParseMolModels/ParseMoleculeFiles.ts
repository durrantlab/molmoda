// You can load some molecule files using 3Dmol.js directly, without requiring
// any conversion. See https://3dmol.csb.pitt.edu/doc/types.html#FileFormats

import * as api from "@/Api";
import type { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { parseUsing3DMolJs } from "./_ParseUsing3DMolJs";
import { parseUsingOpenBabel } from "./_ParseUsingOpenBabel";
import { parseUsingBiotite } from "./_ParseUsingBiotite";
import { molFormatInformation, MolLoader } from "../Types/MolFormats";
import type { FileInfo } from "@/FileSystem/FileInfo";
import { getFileNameParts } from "@/FileSystem/FilenameManipulation";
// import { parseUsingJsZip } from "./ParseUsingJsZip";

// TODO: Might want to load other data too. Could add here. Perhaps a hook that
// plugins can use...

// Create a list of extensions (upper case).
const _allAcceptableFileTypes = Object.values(molFormatInformation).reduce(
    (acc, val) => acc.concat(val.exts.map((x) => x.toUpperCase())),
    [] as string[]
);
_allAcceptableFileTypes.sort();

// And list of extensions for use in input file type "accept" parameter.
export const fileTypesAccepts =
    _allAcceptableFileTypes.map((f) => `.${f.toLowerCase()}`).join(",") +
    ",.zip";

/**
 * Given an IFileInfo object (name, contents, type), load the molecule. Should
 * call only from TreeNodeList.load.
 *
 * @param  {FileInfo} fileInfo The file info object.
 * @param  {boolean} addToTree  Whether to add the molecule to the tree.
 * @returns {Promise<void | TreeNodeList>}  A promise that resolves when the
 *     molecule is loaded.
 */
export function _parseMoleculeFile(
    fileInfo: FileInfo,
    addToTree = true
): Promise<void | TreeNodeList> {
    const spinnerId = api.messages.startWaitSpinner();

    const formatInfo = fileInfo.getFormatInfo();
    if (formatInfo === undefined) {
        return Promise.reject();
    }

    // For 3dmoljs and openbabel loading, models should be merged. So save the
    // promise instead of returning immediately.
    let promise: Promise<TreeNodeList>;

    switch (formatInfo.loader) {
        case MolLoader.Mol3D: {
            promise = parseUsing3DMolJs(fileInfo, formatInfo);
            break;
        }
        case MolLoader.OpenBabel: {
            promise = parseUsingOpenBabel(fileInfo, formatInfo);
            break;
        }
        case MolLoader.BiotiteFormat: {
            return parseUsingBiotite(fileInfo).then((payload: any) => {
                api.messages.stopWaitSpinner(spinnerId);
                return payload;
            });
        }
        // case MolLoader.Zip: {
        //     return parseUsingJsZip(fileInfo);
        // }
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return promise
        .then((treeNodeList: TreeNodeList) => {
            // Merge the TreeNodeLists into one
            // for (let i = 1; i < treeNodeLists.length; i++) {
            //     treeNodeList.extend(treeNodeLists[i]);
            // }

            // Merge the tree nodes into one (so all compounds of multi-compound
            // file under single "Compounds").
            const topLevelName = getFileNameParts(fileInfo.name).basename;
            const mergedTreeNodeList = treeNodeList.merge(topLevelName);

            if (addToTree) {
                mergedTreeNodeList.addToMainTree();
            }

            api.messages.stopWaitSpinner(spinnerId);

            return mergedTreeNodeList;
        })
        .catch((err) => {
            api.messages.stopWaitSpinner(spinnerId);
            throw err;
        });
}
