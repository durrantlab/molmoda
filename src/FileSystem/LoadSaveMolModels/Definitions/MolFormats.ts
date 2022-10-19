import { IFormOption } from "@/UI/Forms/FormFull/FormFullInterfaces";

export enum MolLoader {
    Mol3D, // 3dmoljs. Always prefer over open babel when available.
    OpenBabel,
    Biotite,
    // Zip
}

export interface IFormatInfo {
    primaryExt: string;
    exts: string[];
    description: string;
    hasBondOrders: boolean; // So formats do, some don't.
    loader: MolLoader;
}

export const molFormatInformation: { [key: string]: IFormatInfo } = {
    BIOTITE: {
        primaryExt: "biotite",
        exts: ["biotite"],
        description: "Biotite Session",
        hasBondOrders: true,
        loader: MolLoader.Biotite,
    },
    CIF: {
        primaryExt: "cif",
        exts: ["cif"],
        description: "Crystallographic Information File",
        hasBondOrders: false,
        loader: MolLoader.Mol3D,
    },
    PDB: {
        primaryExt: "pdb",
        exts: ["pdb", "ent"],
        description: "Protein Data Bank",
        hasBondOrders: false,
        loader: MolLoader.Mol3D,
    },
    MOL2: {
        primaryExt: "mol2",
        exts: ["mol2", "ml2", "sy2"],
        description: "Sybyl Mol2",
        hasBondOrders: true,
        loader: MolLoader.Mol3D,
    },
    MCIF: {
        primaryExt: "mcif",
        exts: ["mcif", "mmcif"],
        description: "Macromolecular Crystallographic Info",
        hasBondOrders: false, // Not sure
        loader: MolLoader.Mol3D,
    },
    SDF: {
        primaryExt: "sdf",
        exts: ["sdf", "mol", "sd"],
        description: "MDL MOL",
        hasBondOrders: true,
        loader: MolLoader.Mol3D,
    },
    PDBQT: {
        primaryExt: "pdbqt",
        exts: ["pdbqt"],
        description: "AutoDock PDBQT",
        hasBondOrders: false,
        loader: MolLoader.OpenBabel,
    },
    PQR: {
        primaryExt: "pqr",
        exts: ["pqr"],
        description: "PQR",
        hasBondOrders: false,
        loader: MolLoader.Mol3D,
    },
    SMI: {
        primaryExt: "smi",
        exts: ["smi", "smiles"],
        description: "SMILES",
        hasBondOrders: true,
        loader: MolLoader.OpenBabel,
    },
    CAN: {
        primaryExt: "can",
        exts: ["can"],
        description: "Canonical SMILES",
        hasBondOrders: true,
        loader: MolLoader.OpenBabel,
    },
    XYZ: {
        primaryExt: "xyz",
        exts: ["xyz"],
        description: "XYZ cartesian coordinates",
        hasBondOrders: false,
        loader: MolLoader.Mol3D,
    },
    MMTF: {
        primaryExt: "mmtf",
        exts: ["mmtf"],
        description: "Macromolecular transmission",
        hasBondOrders: false, // Not sure
        loader: MolLoader.Mol3D,
    },
    // ZIP: {
    //     primaryExt: "zip",
    //     exts: ["zip"],
    //     description: "Zip archive",
    //     hasBondOrders: true,  // Not sure
    //     loader: MolLoader.Zip,
    // }
};

/**
 * Get the descriptions of the available formats (for use in saving-molecule
 * modals).
 *
 * @param  {boolean|undefined} [hasbondOrders]  Whether to only return those
 *                                              formats that do or do not
 *                                              support bond orders. Ignored if
 *                                              undefined (returns all formats).
 * @returns {IFormOption[]}  A description of the formats, compatible with
 *     IFormOption.
 */
export function getFormatDescriptions(
    hasbondOrders?: boolean | undefined
): IFormOption[] {
    let keys = Object.keys(molFormatInformation);

    if (hasbondOrders !== undefined) {
        keys = keys.filter(
            (key) => molFormatInformation[key].hasBondOrders === hasbondOrders
        );
    }

    return keys.map((key) => {
        const info = molFormatInformation[key];
        return {
            val: info.primaryExt,
            description: `${info.description} (.${info.primaryExt})`,
        } as IFormOption;
    });
}

/**
 * Get information about a format given its extension.
 *
 * @param  {string} ext  The extension
 * @returns {IFormatInfo | undefined}  Information about the format, or
 *     undefined if the extension is not recognised.
 */
export function getFormatInfoGivenExt(ext: string): IFormatInfo | undefined {
    const extUpper = ext.toLowerCase();
    for (const key in molFormatInformation) {
        if (molFormatInformation[key].exts.includes(extUpper)) {
            return molFormatInformation[key];
        }
    }
    return undefined;
}
