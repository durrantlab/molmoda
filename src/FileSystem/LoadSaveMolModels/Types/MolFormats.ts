import { appName } from "@/Core/GlobalVars";
import { IUserArgOption } from "@/UI/Forms/FormFull/FormFullInterfaces";

export enum MolLoader {
    Mol3D, // 3dmoljs.
    OpenBabel,
    MolModaFormat,
    Zip,
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
    lacks3D?: boolean;
    frameSeparators?: IFrameSeparator[];
    // In some cases, you can extract a title from the file itself.
    extractMolNameRegex?: RegExp[];
    saveWarning?: string;
    extraObabelArgs?: string[];

    // Whenever possible, don't set this variable. Use primaryExt instead. But
    // there are rare occasions when the format name for obabel might differ
    // than the primary extension.
    obabelFormatName?: string;

    // If set, this function will be called to validate the contents of the
    // file. For example, if the file is a PDB file, you might want to check
    // that it contains ATOM lines.
    validateContents?: (contents: string) => boolean;
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
    MOLMODA: {
        primaryExt: "molmoda",
        exts: ["molmoda", "biotite"],
        description: `${appName} Session`,
        hasBondOrders: true,
        loader: MolLoader.MolModaFormat,
    },
    CIF: {
        primaryExt: "cif",
        exts: ["cif"],
        description: "Crystallographic Information File",
        hasBondOrders: false,
        loader: MolLoader.OpenBabel, // 3dmol.js cif parser seems to be broken. Actually, open babel too. Doesn't do multi-frame CIF files.
        frameSeparators: cifLikeSeparators,
        extractMolNameRegex: cifLikeNames,
    },
    PDB: {
        primaryExt: "pdb",
        exts: ["pdb", "ent"],
        description: "Protein Data Bank",
        hasBondOrders: false,
        loader: MolLoader.Mol3D,
        frameSeparators: pdbLikeSeparators,
        extractMolNameRegex: pdbLikeNames,
        saveWarning: "PDB" + noBondOrdersWarning,
        validateContents: (contents: string) => {
            // Note that this will assume pdbqt and pqr files are pdb. But not
            // validating contents of those other files for now.
            const pdbRegex = /^(?:ATOM|HETATM)/m;

            if (!pdbRegex.test(contents)) {
                return false;
            }

            // Problem is that CIF also has ATOM/HETATM. Throw false if "loop_" in text.
            const loopRegex = /^loop_$/m;
            return !(loopRegex.test(contents));
        }
    },
    MOL2: {
        primaryExt: "mol2",
        exts: ["mol2", "ml2", "sy2"],
        description: "Sybyl Mol2",
        hasBondOrders: true,
        loader: MolLoader.OpenBabel,  // MolLoader.Mol3D,  // NOTE: Decided to use openbabel for desalting.
        frameSeparators: [
            {
                text: "\n@<TRIPOS>MOLECULE\n",
                isAtEndOfFrame: false,
            },
        ],
        extractMolNameRegex: [/^@<TRIPOS>MOLECULE\n(.+)$/gm],
        validateContents: (contents: string) => {
            // If contains @<TRIPOS>ATOM, assume it's a mol2 file.
            const mol2Regex = /^@<TRIPOS>ATOM/m;
            return mol2Regex.test(contents);
        }
    },
    MCIF: {
        primaryExt: "mcif",
        exts: ["mcif", "mmcif"],
        description: "Macromolecular Crystallographic Info",
        hasBondOrders: false, // Not sure
        loader: MolLoader.Mol3D,
        frameSeparators: cifLikeSeparators,
        extractMolNameRegex: cifLikeNames,
    },
    SDF: {
        primaryExt: "sdf",
        exts: ["sdf", "mol", "sd"],
        description: "MDL MOL",
        hasBondOrders: true,
        // 3dmol.js sdf parser seems to be broken for some sdf files. So use
        // openbabel.
        loader: MolLoader.OpenBabel,
        frameSeparators: [
            {
                text: "\n$$$$\n",
                isAtEndOfFrame: true,
            },
        ],
        extractMolNameRegex: [
            // NOTE: Leaving off g so will only match first line
            /^(.+)$/m,
        ],
        validateContents: (contents: string) => {
            // If it has $$$$ on its own line, assume it's an sdf file.
            const sdfRegex = /^\$\$\$\$$/m;
            return sdfRegex.test(contents);
        }
    },
    PDBQT: {
        primaryExt: "pdbqt",
        exts: ["pdbqt"],
        description: "AutoDock PDBQT",
        hasBondOrders: false,
        loader: MolLoader.OpenBabel,
        frameSeparators: pdbLikeSeparators,
        extractMolNameRegex: pdbLikeNames,
        extraObabelArgs: ["-xr"], // Rigid (for receptor)
    },
    PDBQTLIG: {
        // NOTE: This is meant for ligands converted to PDBQT. Let's just
        // pretend it's a different format to simplify the code.
        primaryExt: "pdbqtlig",
        exts: ["pdbqtlig"],
        description: "AutoDock PDBQT",
        hasBondOrders: false,
        loader: MolLoader.OpenBabel,
        frameSeparators: pdbLikeSeparators,
        extractMolNameRegex: pdbLikeNames,
        obabelFormatName: "pdbqt",
        // extraObabelArgs: ["-xr"],  // Rigid (for receptor)
    },
    PQR: {
        primaryExt: "pqr",
        exts: ["pqr"],
        description: "PQR",
        hasBondOrders: false,
        loader: MolLoader.Mol3D,
        frameSeparators: pdbLikeSeparators,
        extractMolNameRegex: pdbLikeNames,
    },
    SMI: {
        primaryExt: "smi",
        exts: ["smi", "smiles"],
        description: "SMILES",
        hasBondOrders: true,
        loader: MolLoader.OpenBabel,
        frameSeparators: smiLikeSeparators,
        extractMolNameRegex: smiLikeNames,
        saveWarning: "SMI" + noCoordinatesWarning,
        lacks3D: true,
        validateContents: (contents: string) => {
            let lines = contents.split("\n");
            lines = lines.filter((line) => line.trim().length > 0);
            if (lines.length === 0) {
                return false;
            }

            // Split and consider only first part.
            const smiles = lines.map((line) => line.trim().split(" ")[0]);

            for (let smile of smiles) {
                if (smile.length === 0) {
                    // Blank line?
                    continue
                }

                // If smile can be parsed as a float, it's not a smiles
                if (!isNaN(parseFloat(smile))) {
                    return false;
                }

                // Remove valid characters to see if anything is left.
                
                // Letters
                smile = smile.replace(/[A-Z]/gi, "");
                smile = smile.replace(/[a-z]/gi, "");

                // Numbers
                smile = smile.replace(/\d/g, "");

                // Parentheses
                smile = smile.replace(/\(/g, "");
                smile = smile.replace(/\)/g, "");

                // Square brackets
                smile = smile.replace(/\[/g, "");
                smile = smile.replace(/\]/g, "");

                // Periods
                smile = smile.replace(/\./g, "");

                // Hyphens
                smile = smile.replace(/-/g, "");

                // Plus
                smile = smile.replace(/\+/g, "");

                // Equal signs
                smile = smile.replace(/=/g, "");

                // #
                smile = smile.replace(/#/g, "");

                // Asterisk
                smile = smile.replace(/\*/g, "");

                // @
                smile = smile.replace(/@/g, "");

                // Forward and backslash
                smile = smile.replace(/\//g, "");
                smile = smile.replace(/\\/g, "");

                // Percent
                smile = smile.replace(/%/g, "");

                // colon
                smile = smile.replace(/:/g, "");

                // If anything is left, it's not a valid SMILES.
                if (smile.length > 0) {
                    return false;
                }
            }
            return true;

            // const smiRegex = /^[A-Z][a-z]?(?:[-=]?\(?\d?[A-Z][a-z]?\d?\)?)*$/m;
            // return smiRegex.test(contents);
        }
    },
    CAN: {
        primaryExt: "can",
        exts: ["can"],
        description: "Canonical SMILES",
        hasBondOrders: true,
        loader: MolLoader.OpenBabel,
        frameSeparators: smiLikeSeparators,
        extractMolNameRegex: smiLikeNames,
        saveWarning: "CAN" + noCoordinatesWarning,
        lacks3D: true,
    },
    XYZ: {
        primaryExt: "xyz",
        exts: ["xyz"],
        description: "XYZ cartesian coordinates",
        hasBondOrders: false,
        loader:  MolLoader.Mol3D,
        // technically separated by number on own line, but niche case
        // frameSeparators: null
        extractMolNameRegex: [/^\d+\n(.+)$/gm], // second line, after number-only line
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

    ZIP: {
        primaryExt: "zip",
        exts: ["zip"],
        description: "ZIP archive",
        hasBondOrders: false, // Not sure
        loader: MolLoader.Zip,
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
 * @returns {IUserArgOption[]}  A description of the formats, compatible with
 *     IUserArgOption.
 */
export function getFormatDescriptions(
    hasbondOrders?: boolean | undefined
): IUserArgOption[] {
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
        } as IUserArgOption;
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
