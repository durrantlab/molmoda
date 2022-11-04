import { IFileInfo } from "@/FileSystem/Types";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import * as api from "@/Api";
import { IFormatInfo } from "../Types/MolFormats";
import { parseMolecularModelFromText } from "./Utils";
import { store } from "@/Store";

/**
 * Uses 3DMol.js to parse the a molecular-model file.
 *
 * @param  {IFileInfo}   fileInfo    The file to parse.
 * @param  {IFormatInfo} formatInfo  The format of the file.
 * @returns {Promise<void | IMolContainer[]>}  A promise that resolves when the
 *    file is parsed. The promise resolves to an array of IMolContainer objects,
 *    one for each frame. Can also resolve void.
 */
export function parseUsing3DMolJs(fileInfo: IFileInfo, formatInfo: IFormatInfo): Promise<void | IMolContainer[]> {
    return parseMolecularModelFromText(
        fileInfo.contents,
        formatInfo.primaryExt,
        fileInfo.name
    )
        .then((molContainers: IMolContainer[]) => {
            // Update VueX store
            store.commit("pushToList", {
                name: "molecules",
                val: molContainers,
            });
                        
            api.messages.waitSpinner(false);
            return molContainers;
        })
        .catch((err) => {
            console.warn(err);
        });
}
