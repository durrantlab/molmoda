import { convertMolFormatOpenBabel } from "@/FileSystem/OpenBabelTmp";
import { store } from "@/Store";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { parseMolecularModelFromText } from "./Utils";
import { IFormatInfo } from "../Types/MolFormats";
import { FileInfo } from "@/FileSystem/FileInfo";

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
        .then((contents: string) => {
            return contents;
        })
        .then((contents: string) => {
            return parseMolecularModelFromText(
                contents,
                targetFormat,
                fileInfo.name
            );
        })
        .then((treeNodeList: TreeNodeList) => {
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
