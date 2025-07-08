// Sometimes it's necessary to process many SMILES in bulk, without the expense
// of converting to OpenBabel or rdkit. These functions example direct
// manipulation of SMILES string. Probably not as good as the Open Babel
// implementations, so use sparingly.
import { memoize } from "lodash";
/**
 * Counts heavy atoms in a SMILES fragment, ignoring hydrogens
 * and handling two-letter elements correctly.
 *
 * @param {string} smilesStr  Input SMILES string
 * @returns {number}  Number of heavy atoms
 */
export const easyCountHeavyAtomsSmiles = memoize(function (
    smilesStr: string
): number {
    let count = 0;
    let i = 0;
    while (i < smilesStr.length) {
        // Skip anything in parentheses/numbers/symbols
        if ("()[]{}0123456789-=#+%@".includes(smilesStr[i])) {
            i++;
            continue;
        }

        // Check for bracketed atoms like [Fe] or [Cl]
        if (smilesStr[i] === "[") {
            i++;
            // Get the element name from within brackets
            let elem = "";
            while (i < smilesStr.length && smilesStr[i] !== "]") {
                elem += smilesStr[i];
                i++;
            }
            // Only count if it's not hydrogen
            if (!elem.startsWith("H")) {
                count++;
            }
            i++;
            continue;
        }

        // Handle both regular single-letter elements (C, N, O, etc.)
        // and aromatic atoms (c, n, o, etc.)
        if ("CNOPSFBIcnopsbi".includes(smilesStr[i])) {
            count++;
        }

        i++;
    }
    return count;
});

/**
 * Takes a SMILES string that may contain multiple fragments (separated by
 * periods) and returns only the largest fragment based on heavy atom count.
 * Handles both bracketed and unbracketed atoms correctly. NOTE: It is better to
 * do this via Open Babel, but sometimes it's necessary just to quickly desalt
 * many smiles strings (for example, to process data from a PubChem API call.) I
 * recommend using this function sparingly.
 *
 * @param {string} smilesStr  Input SMILES string that may contain multiple
 *       fragments
 * @returns {string} SMILES string containing only the largest fragment
 */
export const easyDesaltSMILES = memoize(function (smilesStr: string): string {
    // If there's no period in the smilesStr, just return that string.
    if (!smilesStr.includes(".")) {
        return smilesStr;
    }

    // Split on periods that aren't inside brackets
    const fragments = smilesStr.split(".");

    // Find the fragment with the most heavy atoms
    let maxAtoms = 0;
    let largestFragment = fragments[0];

    fragments.forEach((fragment) => {
        const heavyAtomCount = easyCountHeavyAtomsSmiles(fragment);
        if (heavyAtomCount > maxAtoms) {
            maxAtoms = heavyAtomCount;
            largestFragment = fragment;
        }
    });

    return largestFragment;
});

// export function testEasySmilesDesalt() {

//     // Basic salts
//     console.log(easyDesaltSMILES("CC(=O)O.[Na+]"))  // Should return "CC(=O)O"
//     console.log(easyDesaltSMILES("c1ccccc1.[Cl-]"))  // Should return "c1ccccc1"
//     console.log(easyDesaltSMILES("[Na+].CC#N"))  // Should return "CC#N"

//     // Multiple fragments (should return largest)
//     console.log(easyDesaltSMILES("CCO.CCCCO.CC"))  // Should return "CCCCO"
//     console.log(easyDesaltSMILES("c1ccccc1.c1ccccc1Cl"))  // Should return "c1ccccc1Cl"

//     // Water and hydrates
//     console.log(easyDesaltSMILES("CCN.[H]O[H]"))  // Should return "CCN"
//     console.log(easyDesaltSMILES("CC(=O)O.O"))  // Should return "CC(=O)O"

//     // Aromatic compounds with [nH]
//     console.log(easyDesaltSMILES("c1ccc[nH]c1.[Na+]"))  // Should return "c1ccc[nH]c1"
//     console.log(easyDesaltSMILES("[Cl-].c1cc[nH]cc1"))  // Should return "c1cc[nH]cc1"

//     // Multiple salts
//     console.log(easyDesaltSMILES("[Na+].[Cl-].CCO"))  // Should return "CCO"
//     console.log(easyDesaltSMILES("CC(=O)[O-].[Na+].[H]O[H]"))  // Should return "CC(=O)[O-]"

//     // Complex cases
//     console.log(easyDesaltSMILES("CCN(CC)CC.[Zn+2].[Cl-].[Cl-]"))  // Should return "CCN(CC)CC"
//     console.log(easyDesaltSMILES("c1ccccc1.O.O.O.[Na+]"))  // Should return "c1ccccc1"
//     console.log(easyDesaltSMILES("[Ca+2].CC(=O)[O-].CC(=O)[O-]"))  // Should return either CC(=O)[O-] fragment
//     console.log(easyDesaltSMILES("[Na+].C1CC[NH2+]CC1.[Cl-]"))  // Should return "C1CC[NH2+]CC1"
// }

/**
 * Neutralizes charges in a SMILES string by replacing common charged
 * atoms with their neutral unbracketed equivalents.
 * For example: [O-] -> O, [NH+] -> N, etc.
 *
 * @param {string} smilesStr Input SMILES string with potential charges
 * @returns {string} SMILES string with common charged atoms neutralized
 */
export const easyNeutralizeSMILES = memoize(function (
    smilesStr: string
): string {
    // Handle empty or null input
    if (!smilesStr) {
        return smilesStr;
    }

    // Define patterns for common charged atoms and their replacements
    const replacementPatterns = [
        // Oxygen patterns
        { pattern: /\[O-\]/g, replacement: "O" },
        { pattern: /\[OH-\]/g, replacement: "O" },
        { pattern: /\[OH\+\]/g, replacement: "O" },
        { pattern: /\[OH2\+\]/g, replacement: "O" },

        // Sulfur patterns
        { pattern: /\[S-\]/g, replacement: "S" },
        { pattern: /\[SH-\]/g, replacement: "S" },
        { pattern: /\[SH\+\]/g, replacement: "S" },

        // Nitrogen patterns
        { pattern: /\[NH\+\]/g, replacement: "N" },
        { pattern: /\[N-\]/g, replacement: "N" },
        { pattern: /\[NH2\+\]/g, replacement: "N" },
        { pattern: /\[NH3\+\]/g, replacement: "N" },
        { pattern: /\[NH4\+\]/g, replacement: "N" },

        // Carbon patterns
        { pattern: /\[CH-\]/g, replacement: "C" },
        { pattern: /\[CH2-\]/g, replacement: "C" },
        { pattern: /\[CH\+\]/g, replacement: "C" },
        { pattern: /\[CH2\+\]/g, replacement: "C" },
        { pattern: /\[CH3\+\]/g, replacement: "C" },

        // Phosphorus patterns
        { pattern: /\[P-\]/g, replacement: "P" },
        { pattern: /\[PH-\]/g, replacement: "P" },
        { pattern: /\[PH\+\]/g, replacement: "P" },
        { pattern: /\[PH2\+\]/g, replacement: "P" },

        // Halogens
        { pattern: /\[F-\]/g, replacement: "F" },
        { pattern: /\[Cl-\]/g, replacement: "Cl" },
        { pattern: /\[Br-\]/g, replacement: "Br" },
        { pattern: /\[I-\]/g, replacement: "I" },
        { pattern: /\[At-\]/g, replacement: "At" },

        // Aromatic charged atoms
        { pattern: /\[n-\]/g, replacement: "n" },
        { pattern: /\[c-\]/g, replacement: "c" },
        { pattern: /\[o-\]/g, replacement: "o" },
        { pattern: /\[s-\]/g, replacement: "s" },
        { pattern: /\[p-\]/g, replacement: "p" },

        // Boron patterns
        { pattern: /\[B-\]/g, replacement: "B" },
        { pattern: /\[BH-\]/g, replacement: "B" },
        { pattern: /\[BH2-\]/g, replacement: "B" },
        { pattern: /\[BH3-\]/g, replacement: "B" },
        { pattern: /\[BH4-\]/g, replacement: "B" },

        // Silicon patterns
        { pattern: /\[Si-\]/g, replacement: "Si" },

        // Selenium patterns
        { pattern: /\[Se-\]/g, replacement: "Se" },

        // Ammonium patterns with different numbers
        { pattern: /\[NH\d*\+\d*\]/g, replacement: "N" },

        // Common anions
        { pattern: /\[OH-\]/g, replacement: "O" },
        { pattern: /\[SH-\]/g, replacement: "S" },

        // Other issues
        { pattern: /\[c\]/g, replacement: "c" },
        { pattern: /\[n\]/g, replacement: "n" },
        { pattern: /\[o\]/g, replacement: "o" },
        { pattern: /\[s\]/g, replacement: "s" },
        { pattern: /\[p\]/g, replacement: "p" },

        { pattern: /\[C\]/g, replacement: "C" },
        { pattern: /\[N\]/g, replacement: "N" },
        { pattern: /\[O\]/g, replacement: "O" },
        { pattern: /\[S\]/g, replacement: "S" },
        { pattern: /\[P\]/g, replacement: "P" },

        // Need to remove cis/trans isomers, too.
        { pattern: /\//g, replacement: "" },
        { pattern: /\\/g, replacement: "" },

        // Catch-alls for any charges not covered above
        // Note: These should be at the end as they're more general patterns
        // { pattern: /\[([A-Za-z][a-z]?)\+\d*\]/g, replacement: '$1' },
        // { pattern: /\[([A-Za-z][a-z]?)-\d*\]/g, replacement: '$1' }
    ];

    // Apply each replacement pattern
    let neutralized = smilesStr;
    replacementPatterns.forEach(({ pattern, replacement }) => {
        neutralized = neutralized.replace(pattern, replacement);
    });

    // Clean up any periods that might be left over from salt removal
    neutralized = neutralized.replace(/^\.$/, ""); // Period by itself
    neutralized = neutralized.replace(/^\.+/, ""); // Leading periods
    neutralized = neutralized.replace(/\.+$/, ""); // Trailing periods
    neutralized = neutralized.replace(/\.+/g, "."); // Multiple consecutive periods

    return neutralized;
});
