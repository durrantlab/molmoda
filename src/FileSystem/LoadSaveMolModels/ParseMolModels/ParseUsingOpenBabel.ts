import { convertMolFormatOpenBabel } from "@/FileSystem/OpenBabelTmp";
import { store } from "@/Store";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { parseMolecularModelFromText } from "./Utils";
import { IFormatInfo } from "../Types/MolFormats";
import { FileInfo } from "@/FileSystem/FileInfo";

/**
 * Uses OpenBabel to parse the a molecular-model file.
 *
 * @param  {FileInfo}   fileInfo    The file to parse.
 * @param  {IFormatInfo} formatInfo  The format of the file.
 * @returns {Promise<void | IMolContainer[]>}  A promise that resolves when the
 *    file is parsed. The promise resolves to an array of IMolContainer objects,
 *    one for each frame. Can also resolve void.
 */
export function parseUsingOpenBabel(
    fileInfo: FileInfo,
    formatInfo: IFormatInfo
): Promise<void | IMolContainer[]> {
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
