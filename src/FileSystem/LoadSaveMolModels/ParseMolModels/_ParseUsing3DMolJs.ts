import type { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import * as api from "@/Api";
import { parseMolecularModelFromTexts } from "./Utils";
import { store } from "@/Store";
import type { IFormatInfo } from "../Types/MolFormats";
import type { FileInfo } from "@/FileSystem/FileInfo";

/**
 * Uses 3DMol.js to parse the a molecular-model file.
 *
 * @param  {FileInfo}    fileInfo           The file to parse.
 * @param  {IFormatInfo} formatInfo         The format of the file.
 * @param  {boolean}     [addToTree=true]   Whether to add the parsed file to
 *                                          the tree.
 * @returns {Promise<void | TreeNodeList>}  A promise that resolves when the
 *    file is parsed. The promise resolves to a TreeNodeList containing the
 *    frames. Can also resolve void.
 */
export function parseUsing3DMolJs(
    fileInfo: FileInfo,
    formatInfo: IFormatInfo,
    addToTree = true
): Promise<void | TreeNodeList> {
    return parseMolecularModelFromTexts(
        [fileInfo],
        formatInfo.primaryExt
    )
        .then((treeNodeList: TreeNodeList) => {
            if (addToTree) {
                // Update VueX store
                store.commit("pushToMolecules", treeNodeList);
            }

            api.messages.waitSpinner(false);
            return treeNodeList;
        })
        .catch((err) => {
            throw err;
        });
}
