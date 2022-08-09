// These molecule files can be loaded using 3Dmol.js directly, without requiring
// any conversion. See https://3dmol.csb.pitt.edu/doc/types.html#FileFormats

import { IFileInfo } from "./Interfaces";
import { loadMolecularModelFromText } from "./LoadSaveMolModels/LoadMolecularModels";

// (list here is not complete).
export const filetypesMolsWith3DMol = [
    "PDB",
    "ENT", // PDB format with different name
    "SDF",
    "MOL2",
    "XYZ",
    "MCIF",
    "CIF",
    "MMTF",
    "PQR",
    // "CUBE"  // But not used
];

// These molecule files can be loaded by converting to PDB or SDF via openbabel.
// TODO: Complete this list later.
export const fileTypesToConvertWithBabel = ["MOL"];

// TODO: Might want to load other data too. Could add here. Maybe even a hook
// that plugins can use...

// Just to have list of extensions (upper case).
const _allAcceptableFileTypes = [
    ...filetypesMolsWith3DMol,
    ...fileTypesToConvertWithBabel,
];
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

export function loadMoleculeFile(fileInfo: IFileInfo) {
    // Can it be loaded directly by 3dmoljs?
    if (filetypesMolsWith3DMol.includes(fileInfo.type)) {
        let type = fileInfo.type.toLowerCase();
        if (type === "ent") {
            type = "pdb";
        }
        loadMolecularModelFromText(fileInfo.contents, type, fileInfo.name);
    } else if (fileTypesToConvertWithBabel.includes(fileInfo.type)) {
        // Load it by converting to PDB or SDF.
        // TODO: Implement openbabel here
        alert("need to convert!");
    } else {
        // TODO: Any loading functions registered by plugins (to support other
        // formats like charts).
    }
}
