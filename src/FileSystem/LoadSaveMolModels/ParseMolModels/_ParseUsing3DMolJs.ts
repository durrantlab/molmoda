import type { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { parseMolecularModelFromTexts } from "./ParseMolModelsUtils";
import type { IFormatInfo } from "../Types/MolFormats";
import type { FileInfo } from "@/FileSystem/FileInfo";

/**
 * Uses 3DMol.js to parse the a molecular-model file.
 *
 * @param  {FileInfo}    fileInfo           The file to parse.
 * @param  {IFormatInfo} formatInfo         The format of the file.
 * @returns {Promise<TreeNodeList>}  A promise that resolves when the file is
 *    parsed. The promise resolves to a TreeNodeList containing the frames. Can
 *    also resolve void.
 */
export function parseUsing3DMolJs(
    fileInfo: FileInfo,
    formatInfo: IFormatInfo
): Promise<TreeNodeList> {
    return parseMolecularModelFromTexts(
        [fileInfo],
        formatInfo.primaryExt
    ).catch((err) => {
        throw err;
    });
}
