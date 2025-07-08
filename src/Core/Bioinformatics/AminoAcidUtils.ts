// ================== FILE: Core/Bioinformatics/AminoAcidUtils.ts ==================
/**
 * Defines properties and utilities for amino acids.
 */
import { memoize } from "lodash";
import { makeEasyParser } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser";
import { EasyParserParent } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser/EasyParserParent";
import { IFileInfo } from "@/FileSystem/Types";
import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { GLModel } from "@/UI/Panels/Viewer/GLModelType";

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

/**
 * Represents information about a single residue in a protein sequence.
 */
export interface ResidueInfo {
    oneLetterCode: string;
    threeLetterCode: string;
    resi: number;
    chain: string;
    atomIndex?: number; // Optional: 0-based index of the first atom of this residue in the full atom list
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
export const threeLetterToPdbOneLetter = memoize(function (
    threeLetterCode: string
): string {
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
});

/**
 * Converts a one-letter amino acid code to its three-letter code.
 *
 * @param {string} oneLetterCode The one-letter code (e.g., "A").
 * @returns {string} The three-letter code (e.g., "ALA"), or "UNK" if not found.
 */
export const oneLetterToThreeLetter = memoize(function (
    oneLetterCode: string
): string {
    const upperCode = oneLetterCode.toUpperCase();
    // Use hasOwnProperty to prevent prototype pollution
    if (Object.prototype.hasOwnProperty.call(aminoAcidProperties, upperCode)) {
        return aminoAcidProperties[upperCode].threeLetterCode;
    }
    return "UNK";
});

/**
 * Gets the AminoAcidProperty object for a given one-letter code.
 *
 * @param {string} oneLetterCode The one-letter amino acid code.
 * @returns {AminoAcidProperty | undefined} The property object, or undefined if not found.
 */
export const getAminoAcidProperty = memoize(function (
    oneLetterCode: string
): AminoAcidProperty | undefined {
    const upperCode = oneLetterCode.toUpperCase();
    // Use hasOwnProperty to prevent prototype pollution
    if (Object.prototype.hasOwnProperty.call(aminoAcidProperties, upperCode)) {
        return aminoAcidProperties[upperCode];
    }
    return undefined;
});

/**
 * Extracts an ordered sequence of residues from a TreeNode model.
 *
 * @param {IAtom[] | IFileInfo | GLModel | undefined} model The molecular model from a TreeNode.
 * @returns {Promise<ResidueInfo[]>} A promise that resolves to an array of ResidueInfo objects.
 */
export async function getOrderedResidueSequenceFromModel(
    model: IAtom[] | IFileInfo | GLModel | undefined
): Promise<ResidueInfo[]> {
    if (!model) {
        return [];
    }

    const parser: EasyParserParent = makeEasyParser(model);
    const atoms: IAtom[] = parser.atoms; // This getter ensures all atoms are parsed

    if (!atoms || atoms.length === 0) {
        return [];
    }

    const sequence: ResidueInfo[] = [];
    const visitedResidues = new Set<string>(); // To track chain:resi combinations

    for (let i = 0; i < atoms.length; i++) {
        const atom = atoms[i];
        // Ensure atom properties used for key are defined
        const chain = atom.chain ?? "A"; // Default chain if undefined
        const resi = atom.resi ?? 0; // Default resi if undefined
        const resn = atom.resn ?? "UNK"; // Default resn if undefined

        const residueKey = `${chain}:${resi}`;
        if (!visitedResidues.has(residueKey)) {
            sequence.push({
                oneLetterCode: threeLetterToPdbOneLetter(resn),
                threeLetterCode: resn,
                resi: resi,
                chain: chain,
                atomIndex: i, // Store the index of the first atom encountered for this residue
            });
            visitedResidues.add(residueKey);
        }
    }
    return sequence;
}

/**
 * Converts a string containing one or more sequences in FASTA format into an
 * array of name-sequence pairs.
 *
 * If the input text does not contain any '>', it is treated as a list of
 * sequences separated by blank lines, with empty names.
 *
 * @param {string} text  The input string in FASTA or simple sequence list
 *                       format.
 * @returns {string[][]} An array of tuples, where each tuple is `[name,
 *       sequence]`.
 */
export function convertFastaToSeqences(text: string): [string, string][] {
    if (!text.includes(">")) {
        // Fallback for non-FASTA format: sequences separated by blank lines
        const lines = text.split(/\r?\n/);
        const sequences: string[] = [];
        let currentSequence = "";
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine === "") {
                if (currentSequence !== "") {
                    sequences.push(currentSequence);
                    currentSequence = "";
                }
            } else {
                currentSequence += trimmedLine;
            }
        }
        currentSequence = currentSequence.replace("*", ""); // Remove any stop codon asterisk
        if (currentSequence !== "") {
            sequences.push(currentSequence);
        }
        return sequences.map((seq) => ["", seq]);
    }

    // Standard FASTA parsing
    const results: [string, string][] = [];
    const sequenceBlocks = text.split(">").slice(1);
    for (const block of sequenceBlocks) {
        if (block.trim() === "") {
            continue;
        }
        const lines = block.split(/\r?\n/);
        const name = lines[0].trim();
        const sequenceParts = lines.slice(1);
        let sequence = sequenceParts.join("").replace(/\s/g, "");
        sequence = sequence.replace("*", ""); // Remove any stop codon asterisk
        if (name || sequence) {
            results.push([name, sequence]);
        }
    }
    return results;
}
