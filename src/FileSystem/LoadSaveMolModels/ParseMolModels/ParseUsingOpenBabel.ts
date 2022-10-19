import { IFileInfo } from "@/FileSystem/Definitions";
import { convertMolFormatOpenBabel } from "@/FileSystem/OpenBabelTmp";
import { store } from "@/Store";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { IFormatInfo } from "../Definitions/MolFormats";
import { parseMolecularModelFromText } from "./Utils";

export function parseUsingOpenBabel(
    fileInfo: IFileInfo,
    formatInfo: IFormatInfo
): Promise<void | IMolContainer> {
    const targetFormat = formatInfo.hasBondOrders ? "mol2" : "pdb";

    // Convert it to MOL2 format and load that using 3dmoljs.
    return convertMolFormatOpenBabel(
        fileInfo.contents,
        fileInfo.type,
        targetFormat
    )
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
        .then((molContainer: IMolContainer) => {
            // Update VueX store
            store.commit("pushToList", {
                name: "molecules",
                val: molContainer,
            });
            
            return molContainer;
        })
        .catch((err) => {
            // It's a catch block for the promise returned by
            // convertMolFormatOpenBabel.
            console.warn(err);
        });
}
