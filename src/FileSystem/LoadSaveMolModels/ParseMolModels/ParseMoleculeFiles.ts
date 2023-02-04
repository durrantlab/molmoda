// You can load some molecule files using 3Dmol.js directly, without requiring
// any conversion. See https://3dmol.csb.pitt.edu/doc/types.html#FileFormats

import * as api from "@/Api";
import type { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { parseUsing3DMolJs } from "./_ParseUsing3DMolJs";
import { parseUsingOpenBabel } from "./_ParseUsingOpenBabel";
import { parseUsingBiotite } from "./_ParseUsingBiotite";
import { molFormatInformation, MolLoader } from "../Types/MolFormats";
import type { FileInfo } from "@/FileSystem/FileInfo";
// import { parseUsingJsZip } from "./ParseUsingJsZip";

// TODO: Might want to load other data too. Could add here. Perhaps a hook that
// plugins can use...

// Create a list of extensions (upper case).
const _allAcceptableFileTypes = Object.values(molFormatInformation).reduce(
    (acc, val) => acc.concat(val.exts.map((x) => x.toUpperCase())),
    [] as string[]
);
_allAcceptableFileTypes.sort();

// And list of extensions for use in input file type "accept" parameter.
export const fileTypesAccepts = _allAcceptableFileTypes
    .map((f) => `.${f.toLowerCase()}`)
    .join(",") + ",.zip";

/**
 * Given an IFileInfo object (name, contents, type), load the molecule. Should
 * call only from TreeNodeList.load.
 *
 * @param  {FileInfo} fileInfo The file info object.
 * @param  {boolean} addToTree  Whether to add the molecule to the tree.
 * @returns {Promise<void | TreeNodeList>}  A promise that resolves when the
 *     molecule is loaded.
 */
export function _parseMoleculeFile(
    fileInfo: FileInfo,
    addToTree = true
): Promise<void | TreeNodeList> {
    api.messages.waitSpinner(true);

    const formatInfo = fileInfo.getFormatInfo();
    if (formatInfo === undefined) {
        return Promise.reject();
    }

    switch (formatInfo.loader) {
        case MolLoader.Mol3D: {
            return parseUsing3DMolJs(fileInfo, formatInfo, addToTree);
        }
        case MolLoader.OpenBabel: {
            return parseUsingOpenBabel(fileInfo, formatInfo, addToTree);
        }
        case MolLoader.Biotite: {
            return parseUsingBiotite(fileInfo);
        }
        // case MolLoader.Zip: {
        //     return parseUsingJsZip(fileInfo);
        // }
    }

    // Should never get here...
    return Promise.resolve();
}
