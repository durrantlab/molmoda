import { IFileInfo } from "@/FileSystem/Definitions";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import * as api from "@/Api";
import { IFormatInfo } from "../Definitions/MolFormats";
import { parseMolecularModelFromText } from "./Utils";
import { store } from "@/Store";

export function parseUsing3DMolJs(fileInfo: IFileInfo, formatInfo: IFormatInfo): Promise<void | IMolContainer> {
    return parseMolecularModelFromText(
        fileInfo.contents,
        formatInfo.primaryExt,
        fileInfo.name
    )
        .then((molContainer: IMolContainer) => {
            // Update VueX store
            store.commit("pushToList", {
                name: "molecules",
                val: molContainer,
            });
                        
            api.messages.waitSpinner(false);
            return molContainer;
        })
        .catch((err) => {
            console.warn(err);
        });
}
