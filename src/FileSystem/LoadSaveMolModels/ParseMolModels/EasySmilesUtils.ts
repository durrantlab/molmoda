// Sometimes it's necessary to process many SMILES in bulk, without the expense
// of converting to OpenBabel or rdkit. These functions example direct
// manipulation of SMILES string. Probably not as good as the Open Babel
// implementations, so use sparingly.

/**
 * Counts heavy atoms in a SMILES fragment, ignoring hydrogens
 * and handling two-letter elements correctly.
 * 
 * @param {string} smilesStr  Input SMILES string
 * @returns {number}  Number of heavy atoms
 */
export function easyCountHeavyAtomsSmiles(smilesStr: string): number {
    let count = 0;
    let i = 0;
    while (i < smilesStr.length) {
        // Skip anything in parentheses/numbers/symbols
        if ("()[]{}0123456789-=#+%@".includes(smilesStr[i])) {
            i++;
            continue;
        }

        // Check for bracketed atoms like [Fe] or [Cl]
        if (smilesStr[i] === '[') {
            i++;
            // Get the element name from within brackets
            let elem = '';
            while (i < smilesStr.length && smilesStr[i] !== ']') {
                elem += smilesStr[i];
                i++;
            }
            // Only count if it's not hydrogen
            if (!elem.startsWith('H')) {
                count++;
            }
            i++;
            continue;
        }

        // Handle both regular single-letter elements (C, N, O, etc.)
        // and aromatic atoms (c, n, o, etc.)
        if ('CNOPSFBIcnopsbi'.includes(smilesStr[i])) {
            count++;
        }

        i++;
    }
    return count;
}

/**
 * Takes a SMILES string that may contain multiple fragments (separated by
 * periods) and returns only the largest fragment based on heavy atom count.
 * Handles both bracketed and unbracketed atoms correctly. NOTE: It is better to
 * do this via Open Babel, but sometimes it's necessary just to quickly desalt
 * many smiles strings (for example, to process data from a PubChem API call.) I
 * recommend using this function sparingly.
 *
 * @param {string} smilesStr  Input SMILES string that may contain multiple
 *                            fragments
 * @returns {string} SMILES string containing only the largest fragment
 */
export function easyDesaltSMILES(smilesStr: string): string {
    // If there's no period in the smilesStr, just return that string.
    if (!smilesStr.includes(".")) {
        return smilesStr;
    }

    // Split on periods that aren't inside brackets
    const fragments = smilesStr.split('.');

    // Find the fragment with the most heavy atoms
    let maxAtoms = 0;
    let largestFragment = fragments[0];

    fragments.forEach(fragment => {
        const heavyAtomCount = easyCountHeavyAtomsSmiles(fragment);
        if (heavyAtomCount > maxAtoms) {
            maxAtoms = heavyAtomCount;
            largestFragment = fragment;
        }
    });

    return largestFragment;
}

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