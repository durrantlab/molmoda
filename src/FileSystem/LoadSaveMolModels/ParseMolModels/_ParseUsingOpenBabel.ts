import { store } from "@/Store";
import type { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { parseMolecularModelFromTexts } from "./Utils";
import { IFormatInfo } from "../Types/MolFormats";
import { FileInfo } from "@/FileSystem/FileInfo";
import { convertMolFormatOpenBabel } from "@/FileSystem/OpenBabel/OpenBabel";

/**
 * Uses OpenBabel to parse the a molecular-model file.
 *
 * @param  {FileInfo}    fileInfo           The file to parse.
 * @param  {IFormatInfo} formatInfo         The format of the file.
 * @param  {boolean}     [addToTree=true]   Whether to add the parsed file to
 *                                          the tree.
 * @returns {Promise<void | TreeNodeList>}  A promise that resolves when the
 *    file is parsed. The promise resolves to an array of TreeNode objects, one
 *    for each frame. Can also resolve void.
 */
export function parseUsingOpenBabel(
    fileInfo: FileInfo,
    formatInfo: IFormatInfo,
    addToTree = true
): Promise<void | TreeNodeList> {
    const targetFormat = formatInfo.hasBondOrders ? "mol2" : "pdb";

    // Convert it to MOL2 format and load that using 3dmoljs.
    return convertMolFormatOpenBabel(fileInfo, targetFormat)
        .then((contents: string[]) => {
            const fileInfos = contents.map((c, i) => {
                return new FileInfo({
                    contents: c,
                    name: `${fileInfo.name} (frame ${i + 1})`,
                });
            });
            return parseMolecularModelFromTexts(fileInfos, targetFormat);
        })
        .then((treeNodeList: TreeNodeList) => {
            // Merge the TreeNodeLists into one
            // for (let i = 1; i < treeNodeLists.length; i++) {
            //     treeNodeList.extend(treeNodeLists[i]);
            // }

            if (addToTree) {
                // Update VueX store
                store.commit("pushToMolecules", treeNodeList);
            }

            return treeNodeList;
        })
        .catch((err) => {
            // It's a catch block for the promise returned by
            // convertMolFormatOpenBabel.
            throw err;
        });
}
