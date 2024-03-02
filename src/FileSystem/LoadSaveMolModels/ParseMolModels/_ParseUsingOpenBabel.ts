import type { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { parseMolecularModelFromTexts } from "./Utils";
import { IFormatInfo } from "../Types/MolFormats";
import { FileInfo } from "@/FileSystem/FileInfo";
import { convertFileInfosOpenBabel } from "@/FileSystem/OpenBabel/OpenBabel";

/**
 * Uses OpenBabel to parse the a molecular-model file.
 *
 * @param  {FileInfo}    fileInfo           The file to parse.
 * @param  {IFormatInfo} formatInfo         The format of the file.
 * @param  {boolean}     [desalt=false]     Whether to desalt the molecules.
 * @returns {Promise<TreeNodeList>}  A promise that resolves when the file is
 *    parsed. The promise resolves to an array of TreeNode objects, one for each
 *    frame. Can also resolve void.
 */
export function parseUsingOpenBabel(
    fileInfo: FileInfo,
    formatInfo: IFormatInfo,
    desalt = false
): Promise<TreeNodeList> {
    const targetFormat = formatInfo.hasBondOrders ? "mol2" : "pdb";

    // Convert it to MOL2 format and load that using 3dmoljs.
    return convertFileInfosOpenBabel([fileInfo], targetFormat, undefined, undefined, desalt)
        .then((contents: string[]) => {
            const hasMultipleFrames = contents.length > 1;
            const fileInfos = contents.map((c, i) => {
                // Separate basename and extension.

                // Need to account for multiple frames.
                let { name } = fileInfo;
                if (hasMultipleFrames) {
                    // const prts = getFileNameParts(fileInfo.name);
                    // name = `(frame ${i + 1}) ${prts.basename}.${prts.ext}`;
                    name = `(frame${i + 1}) ${fileInfo.name}`;
                }

                return new FileInfo({
                    contents: c,
                    name: name,
                });
            });
            return parseMolecularModelFromTexts(
                fileInfos,
                targetFormat
            );
        })
        .catch((err) => {
            // It's a catch block for the promise returned by
            // convertMolFormatOpenBabel.
            throw err;
        });
}
