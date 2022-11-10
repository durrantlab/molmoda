import { IFormOption } from "@/UI/Forms/FormFull/FormFullInterfaces";

export enum MolLoader {
    Mol3D, // 3dmoljs. Always prefer over open babel when available.
    OpenBabel,
    Biotite,
    // Zip
}

interface IFrameSeparator {
    text: string;
    isAtEndOfFrame: boolean;
}

export interface IFormatInfo {
    primaryExt: string;
    exts: string[];
    description: string;
    hasBondOrders: boolean; // So formats do, some don't.
    loader: MolLoader;
    frameSeparators?: IFrameSeparator[];
    // In some cases, you can extract a title from the file itself.
    namesRegex?: RegExp[];
    saveWarning?: string;
}

const pdbLikeSeparators = [
    {
        text: "\nENDMDL\n",
        isAtEndOfFrame: true,
    },

    {
        text: "\nEND\n",
        isAtEndOfFrame: true,
    },
];

const cifLikeSeparators = [
    {
        text: "\ndata_",
        isAtEndOfFrame: false,
    },
];

const smiLikeSeparators = [
    {
        text: "\n",
        isAtEndOfFrame: true,
    },
];

const noBondOrdersWarning =
    " files do not describe bond orders. One can reliably infer bond orders for most macromolecules (e.g., proteins). For small molecules, consider a format like SDF or MOL2 instead.";
const noCoordinatesWarning =
    " files do not include 3D atomic coordinates. Consider a format like SDF or MOL2 if coordinates are essential.";

const pdbLikeNames = [
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    /^COMPND *2 MOLECULE: (.+?) *$/gm,
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    /^COMPND *(.+?) *$/gm,
];

const cifLikeNames = [
    /^_chemical_name_common '(.+?)'$/gm,
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    /^_struct\.pdbx_descriptor\s*'(.+?)'\s*$/gm,
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    /^_entry.id\s*(.+?)\s*?$/gm,
];

const smiLikeNames = [
    // Just second column
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    /\s+(.+?)\s*$/gm,
];

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
        loader: MolLoader.OpenBabel, // 3dmol.js cif parser seems to be broken.
        frameSeparators: cifLikeSeparators,
        namesRegex: cifLikeNames,
    },
    PDB: {
        primaryExt: "pdb",
        exts: ["pdb", "ent"],
        description: "Protein Data Bank",
        hasBondOrders: false,
        loader: MolLoader.Mol3D,
        frameSeparators: pdbLikeSeparators,
        namesRegex: pdbLikeNames,
        saveWarning: "PDB" + noBondOrdersWarning,
    },
    MOL2: {
        primaryExt: "mol2",
        exts: ["mol2", "ml2", "sy2"],
        description: "Sybyl Mol2",
        hasBondOrders: true,
        loader: MolLoader.Mol3D,
        frameSeparators: [
            {
                text: "\n@<TRIPOS>MOLECULE\n",
                isAtEndOfFrame: false,
            },
        ],
        namesRegex: [/^@<TRIPOS>MOLECULE\n(.+)$/gm],
    },
    MCIF: {
        primaryExt: "mcif",
        exts: ["mcif", "mmcif"],
        description: "Macromolecular Crystallographic Info",
        hasBondOrders: false, // Not sure
        loader: MolLoader.Mol3D,
        frameSeparators: cifLikeSeparators,
        namesRegex: cifLikeNames,
    },
    SDF: {
        primaryExt: "sdf",
        exts: ["sdf", "mol", "sd"],
        description: "MDL MOL",
        hasBondOrders: true,
        loader: MolLoader.Mol3D,
        frameSeparators: [
            {
                text: "\n$$$$\n",
                isAtEndOfFrame: true,
            },
        ],
        namesRegex: [
            // NOTE: Leaving off g so will only match first line
            /^(.+)$/m,
        ],
    },
    PDBQT: {
        primaryExt: "pdbqt",
        exts: ["pdbqt"],
        description: "AutoDock PDBQT",
        hasBondOrders: false,
        loader: MolLoader.OpenBabel,
        frameSeparators: pdbLikeSeparators,
        namesRegex: pdbLikeNames,
    },
    PQR: {
        primaryExt: "pqr",
        exts: ["pqr"],
        description: "PQR",
        hasBondOrders: false,
        loader: MolLoader.Mol3D,
        frameSeparators: pdbLikeSeparators,
        namesRegex: pdbLikeNames,
    },
    SMI: {
        primaryExt: "smi",
        exts: ["smi", "smiles"],
        description: "SMILES",
        hasBondOrders: true,
        loader: MolLoader.OpenBabel,
        frameSeparators: smiLikeSeparators,
        namesRegex: smiLikeNames,
        saveWarning: "SMI" + noCoordinatesWarning,
    },
    CAN: {
        primaryExt: "can",
        exts: ["can"],
        description: "Canonical SMILES",
        hasBondOrders: true,
        loader: MolLoader.OpenBabel,
        frameSeparators: smiLikeSeparators,
        namesRegex: smiLikeNames,
        saveWarning: "CAN" + noCoordinatesWarning,
    },
    XYZ: {
        primaryExt: "xyz",
        exts: ["xyz"],
        description: "XYZ cartesian coordinates",
        hasBondOrders: false,
        loader: MolLoader.Mol3D,
        // technically separated by number on own line, but niche case
        // frameSeparators: null
        namesRegex: [/^\d+\n(.+)$/gm], // second line, after number-only line
        saveWarning: "XYZ" + noBondOrdersWarning,
    },
    MMTF: {
        // NOTE: binary format
        primaryExt: "mmtf",
        exts: ["mmtf"],
        description: "Macromolecular transmission",
        hasBondOrders: false, // Not sure
        loader: MolLoader.Mol3D,
    },
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
 * @param  {string} typ  The type (as returned by getFileType).
 * @returns {IFormatInfo | undefined}  Information about the format, or
 *     undefined if the extension is not recognised.
 */
export function getFormatInfoGivenType(typ: string): IFormatInfo | undefined {
    const extUpper = typ.toLowerCase();
    for (const key in molFormatInformation) {
        if (molFormatInformation[key].exts.includes(extUpper)) {
            return molFormatInformation[key];
        }
    }
    return undefined;
}
