// ================== FILE: Core/Bioinformatics/AminoAcidUtils.ts ==================
/**
 * Defines properties and utilities for amino acids.
 */

// Color constants for amino acid categories
const HYDROPHOBIC_COLOR = "#C8C8C8"; // Grey
const HYDROPHOBIC_AROMATIC_COLOR = "#B4B4B4"; // Darker Grey
const POLAR_NEUTRAL_COLOR = "#FFB469"; // Orange
const ACIDIC_NEGATIVE_COLOR = "#E60A0A"; // Bright Red
const BASIC_POSITIVE_COLOR = "#145AFF"; // Bright Blue
const SPECIAL_CYS_COLOR = "#E6E600"; // Yellow (sulfur)
const SPECIAL_GLY_COLOR = "#FFFFFF"; // White (achiral, small)
const SPECIAL_PRO_COLOR = "#DC9682"; // Pinkish/Brown (cyclic)
const UNKNOWN_COLOR = "#BEBEBE"; // Light grey for X, UNK
const AMBIGUOUS_ACIDIC_POLAR_COLOR = "#FA8072"; // Salmon (for B, Z - can be acidic or polar)
const AMBIGUOUS_HYDROPHOBIC_COLOR = "#A0D2A0"; // Lighter green (for J)

export interface AminoAcidProperty {
    oneLetterCode: string;
    threeLetterCode: string;
    name: string;
    category: "hydrophobic" | "polar" | "acidic" | "basic" | "special";
    color: string; // Hex color code
}

export const aminoAcidProperties: Record<string, AminoAcidProperty> = {
    // Hydrophobic (Aliphatic)
    A: {
        oneLetterCode: "A",
        threeLetterCode: "ALA",
        name: "Alanine",
        category: "hydrophobic",
        color: HYDROPHOBIC_COLOR,
    },
    V: {
        oneLetterCode: "V",
        threeLetterCode: "VAL",
        name: "Valine",
        category: "hydrophobic",
        color: HYDROPHOBIC_COLOR,
    },
    I: {
        oneLetterCode: "I",
        threeLetterCode: "ILE",
        name: "Isoleucine",
        category: "hydrophobic",
        color: HYDROPHOBIC_COLOR,
    },
    L: {
        oneLetterCode: "L",
        threeLetterCode: "LEU",
        name: "Leucine",
        category: "hydrophobic",
        color: HYDROPHOBIC_COLOR,
    },
    M: {
        oneLetterCode: "M",
        threeLetterCode: "MET",
        name: "Methionine",
        category: "hydrophobic",
        color: HYDROPHOBIC_COLOR,
    },

    // Hydrophobic (Aromatic)
    F: {
        oneLetterCode: "F",
        threeLetterCode: "PHE",
        name: "Phenylalanine",
        category: "hydrophobic",
        color: HYDROPHOBIC_AROMATIC_COLOR,
    },
    W: {
        oneLetterCode: "W",
        threeLetterCode: "TRP",
        name: "Tryptophan",
        category: "hydrophobic",
        color: HYDROPHOBIC_AROMATIC_COLOR,
    },
    Y: {
        oneLetterCode: "Y",
        threeLetterCode: "TYR",
        name: "Tyrosine",
        category: "hydrophobic",
        color: HYDROPHOBIC_AROMATIC_COLOR,
    },

    // Polar (Neutral)
    S: {
        oneLetterCode: "S",
        threeLetterCode: "SER",
        name: "Serine",
        category: "polar",
        color: POLAR_NEUTRAL_COLOR,
    },
    T: {
        oneLetterCode: "T",
        threeLetterCode: "THR",
        name: "Threonine",
        category: "polar",
        color: POLAR_NEUTRAL_COLOR,
    },
    N: {
        oneLetterCode: "N",
        threeLetterCode: "ASN",
        name: "Asparagine",
        category: "polar",
        color: POLAR_NEUTRAL_COLOR,
    },
    Q: {
        oneLetterCode: "Q",
        threeLetterCode: "GLN",
        name: "Glutamine",
        category: "polar",
        color: POLAR_NEUTRAL_COLOR,
    },

    // Acidic (Negatively charged)
    D: {
        oneLetterCode: "D",
        threeLetterCode: "ASP",
        name: "Aspartic Acid",
        category: "acidic",
        color: ACIDIC_NEGATIVE_COLOR,
    },
    E: {
        oneLetterCode: "E",
        threeLetterCode: "GLU",
        name: "Glutamic Acid",
        category: "acidic",
        color: ACIDIC_NEGATIVE_COLOR,
    },

    // Basic (Positively charged)
    R: {
        oneLetterCode: "R",
        threeLetterCode: "ARG",
        name: "Arginine",
        category: "basic",
        color: BASIC_POSITIVE_COLOR,
    },
    H: {
        oneLetterCode: "H",
        threeLetterCode: "HIS",
        name: "Histidine",
        category: "basic",
        color: BASIC_POSITIVE_COLOR,
    },
    K: {
        oneLetterCode: "K",
        threeLetterCode: "LYS",
        name: "Lysine",
        category: "basic",
        color: BASIC_POSITIVE_COLOR,
    },

    // Special Cases
    C: {
        oneLetterCode: "C",
        threeLetterCode: "CYS",
        name: "Cysteine",
        category: "special",
        color: SPECIAL_CYS_COLOR,
    },
    G: {
        oneLetterCode: "G",
        threeLetterCode: "GLY",
        name: "Glycine",
        category: "special",
        color: SPECIAL_GLY_COLOR,
    },
    P: {
        oneLetterCode: "P",
        threeLetterCode: "PRO",
        name: "Proline",
        category: "special",
        color: SPECIAL_PRO_COLOR,
    },

    // Unknown or non-standard
    X: {
        oneLetterCode: "X",
        threeLetterCode: "UNK",
        name: "Unknown",
        category: "special",
        color: UNKNOWN_COLOR,
    },
    B: {
        oneLetterCode: "B",
        threeLetterCode: "ASX",
        name: "Asparagine/Aspartic Acid",
        category: "special",
        color: AMBIGUOUS_ACIDIC_POLAR_COLOR,
    },
    Z: {
        oneLetterCode: "Z",
        threeLetterCode: "GLX",
        name: "Glutamine/Glutamic Acid",
        category: "special",
        color: AMBIGUOUS_ACIDIC_POLAR_COLOR,
    },
    J: {
        oneLetterCode: "J",
        threeLetterCode: "XLE",
        name: "Leucine/Isoleucine",
        category: "special",
        color: AMBIGUOUS_HYDROPHOBIC_COLOR,
    },
};

/**
 * Converts a three-letter amino acid code (case-insensitive) to its one-letter code.
 * Handles common PDB variations for modified residues by mapping them to their parent amino acid.
 *
 * @param {string} threeLetterCode The three-letter code (e.g., "ALA", "mse").
 * @returns {string} The one-letter code (e.g., "A"), or "X" if not found or ambiguous.
 */
export function threeLetterToPdbOneLetter(threeLetterCode: string): string {
    const upperCode = threeLetterCode.toUpperCase();

    // Direct match
    for (const key in aminoAcidProperties) {
        if (aminoAcidProperties[key].threeLetterCode === upperCode) {
            return aminoAcidProperties[key].oneLetterCode;
        }
    }

    // Handle common PDB variations by mapping to standard one-letter codes
    const pdbVariations: Record<string, string> = {
        MSE: "M", // Selenomethionine
        CSO: "C", // S-hydroxycysteine
        SEP: "S", // Phosphoserine
        TPO: "T", // Phosphothreonine
        PTR: "Y", // Phosphotyrosine
        // 'ASX': 'B', // Asparagine or Aspartic acid - already handled by aminoAcidProperties 'B'
        // 'GLX': 'Z', // Glutamine or Glutamic acid - already handled by aminoAcidProperties 'Z'
        // 'XLE': 'J', // Leucine or Isoleucine - already handled by aminoAcidProperties 'J'
        UNK: "X", // Unknown
        // Add more mappings as needed for specific PDB HETNAMs that should map to a standard AA
    };

    if (pdbVariations[upperCode]) {
        return pdbVariations[upperCode];
    }

    return "X"; // Default for unmapped or truly unknown residues
}

/**
 * Converts a one-letter amino acid code to its three-letter code.
 *
 * @param {string} oneLetterCode The one-letter code (e.g., "A").
 * @returns {string} The three-letter code (e.g., "ALA"), or "UNK" if not found.
 */
export function oneLetterToThreeLetter(oneLetterCode: string): string {
    const upperCode = oneLetterCode.toUpperCase();
    // Use hasOwnProperty to prevent prototype pollution
    if (Object.prototype.hasOwnProperty.call(aminoAcidProperties, upperCode)) {
        return aminoAcidProperties[upperCode].threeLetterCode;
    }
    return "UNK";
}

/**
 * Gets the AminoAcidProperty object for a given one-letter code.
 *
 * @param {string} oneLetterCode The one-letter amino acid code.
 * @returns {AminoAcidProperty | undefined} The property object, or undefined if not found.
 */
export function getAminoAcidProperty(
    oneLetterCode: string
): AminoAcidProperty | undefined {
    const upperCode = oneLetterCode.toUpperCase();
    // Use hasOwnProperty to prevent prototype pollution
    if (Object.prototype.hasOwnProperty.call(aminoAcidProperties, upperCode)) {
        return aminoAcidProperties[upperCode];
    }
    return undefined;
}
