import { IFileInfo } from "@/FileSystem/Types";
import { EasyParserParent } from "./EasyParserParent";
import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { GLModel } from "@/UI/Panels/Viewer/GLModelType";

interface ISDFBond {
    atomIndex1: number; // 0-indexed based on order in SDF atom block
    atomIndex2: number; // 0-indexed based on order in SDF atom block
    bondType: number;
}

/**
 * A parser for SDF (Structure-Data File) files.
 * Parses atom and bond information from the first molecule in an SDF string.
 */
export class EasyParserSDF extends EasyParserParent {
    private _parsedBonds: ISDFBond[] = [];
    private _atomOriginalIndexMap: Map<number, number> = new Map();

    /**
     * Load the source.
     *
     * @param {IFileInfo} src  The source to parse.
     */
    _load(src: IFileInfo | GLModel | IAtom[]): void {
        // Ensure fields are initialized before doing anything else
        if (!this._parsedBonds) {
            this._parsedBonds = [];
        }
        if (!this._atomOriginalIndexMap) {
            this._atomOriginalIndexMap = new Map();
        }
        
        const lines = (src as IFileInfo).contents.split(/\r?\n/);
        this._atoms = [];
        this._parsedBonds = [];
        this._atomOriginalIndexMap.clear();

        let atomCount = 0;
        let bondCount = 0;
        let countsLineIndex = -1;
        const currentAtomBlockLines: string[] = [];

        // Find the counts line (typically 4th line, 0-indexed) for the first molecule
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (i >= 3 && line.trim().endsWith("V2000")) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2) {
                    const numAtoms = parseInt(parts[0], 10);
                    const numBonds = parseInt(parts[1], 10);
                    if (!isNaN(numAtoms) && !isNaN(numBonds)) {
                        atomCount = numAtoms;
                        bondCount = numBonds;
                        countsLineIndex = i;
                        break;
                    }
                }
            }
            if (line.trim() === "$$$$") {
                // End of the first molecule block
                break;
            }
        }

        if (countsLineIndex === -1) {
            // console.warn("SDF parsing: Could not find a valid V2000 counts line for the first molecule.");
            // Attempt a heuristic parse for atoms if no counts line is found, this is less reliable
            let inMoleculeBlock = false;
            for (let i = 0; i < lines.length; ++i) {
                const line = lines[i];
                if (line.includes("M  END") || line.trim() === "$$$$") {
                    break;
                }
                // Heuristic: Atom lines have X, Y, Z coords and an element symbol.
                // Example: "  -0.6664   -0.2064    0.1642 C   0  0  0  0  0  0  0  0  0  0  0  0"
                if (
                    line.match(
                        /^\s*-?\d+\.\d{4}\s+-?\d+\.\d{4}\s+-?\d+\.\d{4}\s+\w/
                    )
                ) {
                    // Assume past header
                    if (!inMoleculeBlock && i > 2) {
                        inMoleculeBlock = true;
                    }
                    if (inMoleculeBlock) {
                        currentAtomBlockLines.push(line);
                    }
                } else if (
                    inMoleculeBlock &&
                    currentAtomBlockLines.length > 0 &&
                    !line.match(/^\s*\d+\s+\d+\s+\d+/)
                ) {
                    // If we were reading atoms and the next line doesn't look like a bond or atom, stop.
                    break;
                }
            }
            this._atoms = currentAtomBlockLines;
            // Note: Bond parsing is skipped in this heuristic fallback as it's unreliable without counts.
            return;
        }

        // Extract atom lines
        const atomBlockStartIndex = countsLineIndex + 1;
        for (let i = 0; i < atomCount; i++) {
            const atomLineIndex = atomBlockStartIndex + i;
            if (atomLineIndex < lines.length) {
                currentAtomBlockLines.push(lines[atomLineIndex]);
                // Map the 0-indexed position in our _atoms array to the original 1-based SDF atom index
                this._atomOriginalIndexMap.set(i, i + 1);
            } else {
                // console.warn("SDF parsing: Atom count in counts line exceeds available lines in file.");
                break;
            }
        }
        this._atoms = currentAtomBlockLines;

        // Extract bond lines
        const bondBlockStartIndex = atomBlockStartIndex + atomCount;
        for (let i = 0; i < bondCount; i++) {
            const bondLineIndex = bondBlockStartIndex + i;
            if (bondLineIndex < lines.length) {
                const line = lines[bondLineIndex];
                // SDF bond line: aaabbbttt... (atom1_idx, atom2_idx, bond_type)
                // Atom indices are 1-based in SDF format.
                const atomIdx1 = parseInt(line.substring(0, 3).trim(), 10) - 1; // Convert to 0-indexed
                const atomIdx2 = parseInt(line.substring(3, 6).trim(), 10) - 1; // Convert to 0-indexed
                const bondType = parseInt(line.substring(6, 9).trim(), 10);
                if (!isNaN(atomIdx1) && !isNaN(atomIdx2) && !isNaN(bondType)) {
                    this._parsedBonds.push({
                        atomIndex1: atomIdx1,
                        atomIndex2: atomIdx2,
                        bondType,
                    });
                }
            } else {
                // console.warn("SDF parsing: Bond count in counts line exceeds available lines in file.");
                break;
            }
        }
    }

    /**
     * Parse an atom line string from SDF into an IAtom object. This method is
     * called by the `getAtom` method of the parent class.
     *
     * @param {string} atomStr The atom line string.
     * @param {number} [atomParserIndex] The 0-based index of this atom in the
     *                                   parser's `_atoms` list. This parameter
     *                                   is required by EasyParserSDF.
     * @returns {IAtom | undefined} The parsed atom, or undefined if parsing
     * fails.
     */
    _parseAtomStr(
        atomStr: string,
        atomParserIndex?: number
    ): IAtom | undefined {
        // SDF atom line format (V2000):
        // Columns  Content
        //  1-10    x-coordinate
        // 11-20    y-coordinate
        // 21-30    z-coordinate
        // 32-34    Atom symbol (left-justified)
        // 35-36    Mass difference (dd) from default isotope mass. (+/- relative to default)
        // 37-39    Charge (ccc): 0 (uncharged or not specified), 1 (+3), 2 (+2), 3 (+1), 4 (doublet radical), 5 (-1), 6 (-2), 7 (-3)
        // ... more fields exist but are not parsed by this basic parser for now.

        // Basic check
        if (atomStr.length < 34) {
            return undefined;
        }

        // atomParserIndex is essential for SDF bond parsing, ensure it's provided.
        if (atomParserIndex === undefined) {
            // This case should ideally not be reached if getAtom in parent always passes it.
            // console.error("EasyParserSDF._parseAtomStr: atomParserIndex is undefined. This is required for SDF parsing.");
            return undefined;
        }

        const x = parseFloat(atomStr.substring(0, 10).trim());
        const y = parseFloat(atomStr.substring(10, 20).trim());
        const z = parseFloat(atomStr.substring(20, 30).trim());
        const elem = atomStr.substring(31, 34).trim(); // Atom symbol

        let charge = 0;
        if (atomStr.length >= 39) {
            const chargeCode = parseInt(atomStr.substring(36, 39).trim(), 10);
            switch (chargeCode) {
                case 1:
                    charge = 3;
                    break;
                case 2:
                    charge = 2;
                    break;
                case 3:
                    charge = 1;
                    break;
                // case 4: // doublet radical, charge is still 0. We don't store radical info in IAtom.
                case 5:
                    charge = -1;
                    break;
                case 6:
                    charge = -2;
                    break;
                case 7:
                    charge = -3;
                    break;
                default:
                    charge = 0;
                    break; // Includes 0 for uncharged
            }
        }

        const bonds: number[] = [];
        const bondOrder: number[] = [];

        // atomParserIndex is the 0-based index of the current atom line in this._atoms
        this._parsedBonds.forEach((bond) => {
            if (bond.atomIndex1 === atomParserIndex) {
                bonds.push(bond.atomIndex2);
                bondOrder.push(bond.bondType);
            } else if (bond.atomIndex2 === atomParserIndex) {
                bonds.push(bond.atomIndex1);
                bondOrder.push(bond.bondType);
            }
        });

        const originalSdfAtomNumber =
            this._atomOriginalIndexMap.get(atomParserIndex);

        return {
            x,
            y,
            z,
            elem,
            serial: originalSdfAtomNumber, // Use original 1-based SDF atom number for serial
            atom: elem, // In SDF, atom name is usually the element symbol
            resn: "UNL", // SDF doesn't typically have residue names
            chain: "A", // SDF doesn't typically have chains
            resi: 1, // SDF doesn't typically have residue indices
            altLoc: " ", // SDF doesn't have alternate locations in the same way as PDB
            b: charge, // Using 'b' for charge for consistency with EasyParserMol2
            bonds,
            bondOrder,
            // hetflag, etc. are not typically part of basic SDF atom lines
        };
    }

    /**
     * Get the atom at the given 0-based index.
     * Overrides parent to pass the index to `_parseAtomStr` for context.
     *
     * @param {number} idx  The 0-based index of the atom in the internal list.
     * @returns {IAtom} The parsed atom object.
     * @throws {Error} if parsing fails.
     */
    getAtom(idx: number): IAtom {
        const atomEntry = this._atoms[idx];
        // If it's not a string, it's already been parsed and cached.
        if (typeof atomEntry !== "string") {
            return atomEntry as IAtom;
        }
        // Parse the string representation of the atom.
        const parsedAtom = this._parseAtomStr(atomEntry as string, idx);
        if (parsedAtom === undefined) {
            throw new Error(
                `Failed to parse SDF atom line at index ${idx}: "${atomEntry}"`
            );
        }
        // Cache the parsed atom object to avoid re-parsing.
        this._atoms[idx] = parsedAtom;
        return parsedAtom;
    }
}
