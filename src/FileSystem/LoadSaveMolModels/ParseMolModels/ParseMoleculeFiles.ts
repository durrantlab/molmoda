// You can load some molecule files using 3Dmol.js directly, without requiring
// any conversion. See https://3dmol.csb.pitt.edu/doc/types.html#FileFormats

import { IFileInfo } from "../../Definitions";
import * as api from "@/Api";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    molFormatInformation,
    MolLoader,
    getFormatInfoGivenExt,
} from "../Definitions/MolFormats";
import { parseUsing3DMolJs } from "./ParseUsing3DMolJs";
import { parseUsingOpenBabel } from "./ParseUsingOpenBabel";
import { parseUsingBiotite } from "./ParseUsingBiotite";
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
 * Given an IFileInfo object (name, contents, type), load the molecule.
 *
 * @param  {IFileInfo} fileInfo The file info object.
 * @returns {Promise<string>}  A promise that resolves when the molecule is
 *     loaded.
 */
export function parseMoleculeFile(
    fileInfo: IFileInfo
): Promise<void | IMolContainer> {
    api.messages.waitSpinner(true);

    const formatInfo = getFormatInfoGivenExt(fileInfo.type);
    if (formatInfo === undefined) {
        return Promise.reject();
    }

    switch (formatInfo.loader) {
        case MolLoader.Mol3D: {
            return parseUsing3DMolJs(fileInfo, formatInfo);
        }
        case MolLoader.OpenBabel: {
            return parseUsingOpenBabel(fileInfo, formatInfo);
        }
        case MolLoader.Biotite: {
            return parseUsingBiotite(fileInfo);
        }
        // case MolLoader.Zip: {
        //     return parseUsingJsZip(fileInfo);
        // }
    }
}
