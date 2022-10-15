// You can load some molecule files using 3Dmol.js directly, without requiring
// any conversion. See https://3dmol.csb.pitt.edu/doc/types.html#FileFormats

import { IFileInfo } from "../../Definitions";
import * as api from "@/Api";
import { convertMolFormatOpenBabel } from "../../OpenBabelTmp";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { atomsToModels } from "../MolsToFromJSON";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import { store } from "@/Store";
import { molFormatInformation, MolLoader, IFormatInfo, getFormatInfoGivenExt } from "../Definitions/MolFormats";

// (list here is not complete).
// export const filetypesMolsWith3DMol = [
//     "PDB",
//     "ENT", // PDB format with different name
//     "SDF",
//     "MOL2",
//     "XYZ",
//     "MCIF",
//     "CIF",
//     "MMTF",
//     "PQR",
//     // "CUBE"  // But not used
// ];

// You can load these molecule files by converting to PDB or SDF via openbabel.
// TODO: Complete this list later.
// export const fileTypesToConvertWithBabel = ["MOL"];

// TODO: Might want to load other data too. Could add here. Perhaps a hook that
// plugins can use...

/**
 * Loads a molecule from text, using a web worker.
 * 
 * @param  {string} molText The text of the molecule.
 * @param  {string} format  The format of the molecule.
 * @param  {string} molName The name of the molecule.
 * @returns {Promise<IMolContainer>} A promise that resolves the molecule.
 */
 export function loadMolecularModelFromText(
    molText: string,
    format: string,
    molName: string
): Promise<IMolContainer> {
    const worker = new Worker(
        new URL("./LoadMolecularModels.worker", import.meta.url)
    );

    return runWorker(worker, { molText, format, molName })
    .then((molecularData: IMolContainer) => {
        return atomsToModels(molecularData)
    }).then((molecularData: IMolContainer) => {
        // Set molName as src on all terminal nodes
        molecularData.src = molName;
        if (molecularData.nodes) {
            getTerminalNodes(molecularData.nodes).forEach((node: IMolContainer) => {
                node.src = molName;
            });
        }

        // Update VueX store
        store.commit("pushToList", {
            name: "molecules",
            val: molecularData
        });

        return molecularData;
    });
}

// Create a list of extensions (upper case).
const _allAcceptableFileTypes = Object.values(molFormatInformation).reduce(
    (acc, val) => acc.concat(val.exts.map((x) => x.toUpperCase())),
    [] as string[]
);
_allAcceptableFileTypes.sort();

// And list of extensions for use in input file type "accept" parameter.
export const fileTypesAccepts = _allAcceptableFileTypes
    .map((f) => `.${f.toLowerCase()}`)
    .join(",");

// Message explaining acceptable file types (used throughout, so figured I'd
// generate it once here).
// export const acceptableFileTypesMessage = `Acceptable file types: ${allAcceptableFileTypes
//     .map((f) => `${f}`)
//     .join(", ")}`;

/**
 * Given an IFileInfo object (name, contents, type), load the molecule.
 *
 * @param  {IFileInfo} fileInfo The file info object.
 * @returns {Promise<string>}  A promise that resolves when the molecule is
 *     loaded.
 */
export function loadMoleculeFile(fileInfo: IFileInfo): Promise<void | IMolContainer> {
    api.messages.waitSpinner(true);

    const info = getFormatInfoGivenExt(fileInfo.type);
    if (info === undefined) {
        return Promise.reject();
    }

    switch (info.loader) {
        case MolLoader.Mol3D: {
            return loadMolecularModelFromText(
                fileInfo.contents,
                info.primaryExt,
                fileInfo.name
            )
                .then((molContainer: IMolContainer ) => {
                    api.messages.waitSpinner(false);
                    return molContainer;
                })
                .catch((err) => {
                    console.warn(err);
                });
        }
        case MolLoader.OpenBabel: {
            const targetFormat = info.hasBondOrders ? "mol2" : "pdb";

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
                    return loadMolecularModelFromText(
                        contents,
                        targetFormat,
                        fileInfo.name
                    );
                })
                .catch((err) => {
                    /* It's a catch block for the promise returned by convertMolFormatOpenBabel. */
                    console.warn(err);
                });
        }
    }

    return Promise.reject();
}
