import { IFileInfo } from "@/FileSystem/Types";
import { convertMolFormatOpenBabel } from "@/FileSystem/OpenBabelTmp";
import { store } from "@/Store";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { parseMolecularModelFromText } from "./Utils";
import { IFormatInfo } from "../Types/MolFormats";

/**
 * Uses OpenBabel to parse the a molecular-model file.
 *
 * @param  {IFileInfo}   fileInfo    The file to parse.
 * @param  {IFormatInfo} formatInfo  The format of the file.
 * @returns {Promise<void | IMolContainer[]>}  A promise that resolves when the
 *    file is parsed. The promise resolves to an array of IMolContainer objects,
 *    one for each frame. Can also resolve void.
 */
export function parseUsingOpenBabel(
    fileInfo: IFileInfo,
    formatInfo: IFormatInfo
): Promise<void | IMolContainer[]> {
    const targetExt = formatInfo.hasBondOrders ? "mol2" : "pdb";

    // Convert it to MOL2 format and load that using 3dmoljs.
    return convertMolFormatOpenBabel(
        fileInfo.contents,
        fileInfo.type,
        targetExt
    )
        .then((contents: string) => {
            return contents;
        })
        .then((contents: string) => {
            return parseMolecularModelFromText(
                contents,
                targetExt,
                fileInfo.name
            );
        })
        .then((molContainers: IMolContainer[]) => {
            // Update VueX store
            store.commit("pushToList", {
                name: "molecules",
                val: molContainers,
            });
            
            return molContainers;
        })
        .catch((err) => {
            // It's a catch block for the promise returned by
            // convertMolFormatOpenBabel.
            console.warn(err);
        });
}
