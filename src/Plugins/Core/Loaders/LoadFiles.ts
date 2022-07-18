// These molecule files can be loaded using 3Dmol.js directly, without requiring
// any conversion. See https://3dmol.csb.pitt.edu/doc/types.html#FileFormats
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
export const allAcceptableFileTypes = [
    ...filetypesMolsWith3DMol,
    ...fileTypesToConvertWithBabel,
];
allAcceptableFileTypes.sort();

// And list of extensions for use in input file type "accept" parameter.
export const fileTypesAccepts = allAcceptableFileTypes
    .map((f) => `.${f.toLowerCase()}`)
    .join(",");

// Message explaining acceptable file types (used throughout, so figured I'd
// generate it once here).
export const acceptableFileTypesMessage = `Acceptable file types: ${allAcceptableFileTypes
    .map((f) => `${f}`)
    .join(", ")}`;
