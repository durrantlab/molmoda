// Originally, I repurposed the 3dmol.js parser for when plugins need to access
// information about atoms. But I came to realize that this is overkill. I'm now
// going to create a minimal parser for PDB and MOL2 files instead, since these
// are the formats that molmoda uses internally for protein and compound files,
// respectively. It doens't need to have a lot of functionality. It just needs
// to be light on memory.

import { IFileInfo } from "@/FileSystem/Types";
import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { GLModel } from "@/UI/Panels/Viewer/GLModelType";

/** Interface for bounding box */
interface IBounds {
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxY: number;
    maxZ: number;
}

/** Identifies a single residue by chain and residue index. */
export interface IResidueId {
    chain: string;
    resi: number;
}

/**
 * A spatial grid plus the parser whose atoms it indexes. Lets repeated
 * proximity queries against one fixed atom set reuse a single grid instead of
 * rebuilding it per query.
 */
export interface IProximityGrid {
    grid: Map<string, number[]>;
    parser: EasyParserParent;
    distance: number;
}

/**
 * A parent class for easy parsers.
 */
export abstract class EasyParserParent {
    /**
     * Create a new EasyParserParent. Set it to undefined if you want to call
     * _load elsewhere (e.g., in subclass constructor; see EasyParserSDF).
     *
     * @param {IFileInfo | GLModel | IAtom[]} src The source to parse.
     */
    constructor(src: IFileInfo | GLModel | IAtom[] | undefined) {
        if (src !== undefined) {
            this._load(src);
        }
    }

    protected _atoms: (string | IAtom)[] = [];

    /**
     * Load the source.
     *
     * @param {IFileInfo | GLModel | IAtom[]} src  The source to parse.
     */
    abstract _load(src: IFileInfo | GLModel | IAtom[]): void;

    /**
     * Parse an atom.
     *
     * @param {string} atomStr The string to parse.
     * @param {number} [atomParserIndex] Optional: The 0-based index of this
     *                                   atom in the parser's internal list.
     *                                   Useful for parsers that need context
     *                                   (e.g., SDF bond parsing).
     * @returns {IAtom | undefined} The parsed atom, or undefined if not
     *  parsable or function not used.
     */
    abstract _parseAtomStr(
        atomStr: string,
        atomParserIndex?: number
    ): IAtom | undefined;
    /**
     * Get the atom at the given index.
     *
     * @param {number} idx  The index.
     * @returns {IAtom} The atom.
     */
    getAtom(idx: number): IAtom {
        const atom = this._atoms[idx];
        if (atom === undefined || atom === null) {
            throw new Error(`No atom entry at index ${idx}.`);
        }

        // If it's not a string, it's already been parsed.
        if (typeof atom !== "string") {
            return atom as IAtom;
        }

        const parsedAtom = this._parseAtomStr(atom as string, idx);
        if (parsedAtom === undefined) {
            throw new Error("Failed to parse atom.");
        }
        this._atoms[idx] = parsedAtom; // Cache the parsed atom
        return parsedAtom;
    }

    /**
     * The number of atoms.
     *
     * @returns {number} The number of atoms.
     */
    get length(): number {
        return this._atoms.length;
    }

    /**
     * The atoms.
     *
     * @returns {IAtom[]} The atoms.
     */
    get atoms(): IAtom[] {
        return this._atoms.map((atom, idx) => {
            return this.getAtom(idx);
        });
    }

    /**
     * Get the selected atoms.
     *
     * @param {object}  sel        The selection.
     * @param {boolean} [extract]  Whether to extract the selected atoms.
     *                             Default is false.
     * @returns {IAtom[]} The selected atoms.
     */
    selectedAtoms(sel: { [key: string]: string[] }, extract = false): IAtom[] {
        // NOTE: If there are multiple keys, logical OR is applied. So this
        // differs from the 3dmol selectedAtoms function.

        // Not going to support full selectedAtoms available in 3dmol parser.
        // Just bare-bones minimum.

        // You'll need to parse all the atoms.
        let atoms: [number, IAtom][] = [];
        for (let i = 0; i < this.length; i++) {
            atoms.push([i, this.getAtom(i)]);
        }

        const keys = Object.keys(sel);

        // If there are no keys, return all the atoms.
        if (keys.length === 0) {
            if (extract) {
                this._atoms = [];
            }
            return atoms.map(([idx, atom]) => atom);
        }

        let matchingAtoms: [number, IAtom][] = [];

        for (const key of keys) {
            const val = sel[key];

            /**
             * The filter function for the current key.
             * 
             * @param {IAtom} atom The atom to check.
             * @returns {boolean} True if the atom matches the selection, false otherwise.
             */
            let filterFunc: (atom: IAtom) => boolean = (atom: IAtom) => true;

            switch (key) {
                case "resn":
                    /**
                     * Filter function for residue names.
                     * 
                     * @param {IAtom} atom The atom to check.
                     * @returns {boolean} True if the atom's residue name is in
                     *     the selection, false otherwise.
                     */
                    filterFunc = (atom) => val.includes(atom.resn);
                    break;
                case "chain":
                    /**
                     * Filter function for chain identifiers.
                     *
                     * @param {IAtom} atom The atom to check.
                     * @returns {boolean} True if the atom's chain identifier is
                     *     in the selection, false otherwise.
                     */
                    filterFunc = (atom) => val.includes(atom.chain);
                    break;
                case "elem":
                    /**
                     * Filter function for element symbols.
                     *
                     * @param {IAtom} atom The atom to check.
                     * @returns {boolean} True if the atom's element symbol is
                     *     in the selection, false otherwise.
                     */
                    filterFunc = (atom) => {
                        if (atom.elem === undefined) {
                            return false;
                        }
                        return val.includes(atom.elem);
                    };
                    break;
                default:
                    // Should never get here.
                    debugger;
            }

            matchingAtoms = matchingAtoms.concat(
                atoms.filter(([idx, atom]) => filterFunc(atom))
            );

            // Remove matches from atoms.
            atoms = atoms.filter(([idx, atom]) => !filterFunc(atom));
        }

        if (extract) {
            // sort by index
            matchingAtoms.sort(([idx1, atom1], [idx2, atom2]) => idx1 - idx2);
            this._atoms = atoms.map(([idx, atom]) => atom);
        }

        // sort by index
        matchingAtoms.sort(([idx1, atom1], [idx2, atom2]) => idx1 - idx2);
        return matchingAtoms.map(([idx, atom]) => atom);
    }

    /**
     * Append atoms to the molecule.
     *
     * @param {IAtom[]} atoms  The atoms to append.
     */
    appendAtoms(atoms: IAtom | IAtom[]): void {
        if (!Array.isArray(atoms)) {
            atoms = [atoms];
        }
        this._atoms = this._atoms.concat(atoms);
    }

    /**
     * Calculates the bounding box of the atoms in this parser, considering the stride.
     *
     * @param {number} [stride]  The step size for iterating through atoms. Must
     *                           be >= 1. Default is 1 (consider all atoms).
     * @returns {IBounds | null} The bounding box, or null if no atoms with
     *                           coordinates are found.
     */
    getBounds(stride = 1): IBounds | null {
        if (stride < 1) {
            throw new Error("Stride must be >= 1");
        }

        let minX = Infinity;
        let minY = Infinity;
        let minZ = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let maxZ = -Infinity;
        let foundCoords = false;

        for (let i = 0; i < this.length; i += stride) {
            const atom = this.getAtom(i);
            if (
                atom.x !== undefined &&
                atom.y !== undefined &&
                atom.z !== undefined
            ) {
                foundCoords = true;
                minX = Math.min(minX, atom.x);
                minY = Math.min(minY, atom.y);
                minZ = Math.min(minZ, atom.z);
                maxX = Math.max(maxX, atom.x);
                maxY = Math.max(maxY, atom.y);
                maxZ = Math.max(maxZ, atom.z);
            }
        }

        if (!foundCoords) {
            return null; // No atoms with coordinates found
        }

        return { minX, minY, minZ, maxX, maxY, maxZ };
    }

    /**
     * Checks if the molecule is "flat", meaning all its atoms lie on one of the
     * cardinal planes (XY, XZ, or YZ). This is determined by checking if all atoms
     * have a Z, Y, or X coordinate of 0, respectively. This is a common
     * characteristic of 2D structure representations.
     *
     * @returns {boolean} True if the molecule is flat, false otherwise. Returns
     *          false if there are no atoms.
     */
    public isFlat(): boolean {
        if (this.length === 0) {
            return false;
        }
        const atoms = this.atoms; // This ensures all atoms are parsed
        if (atoms.length === 0) {
            return false;
        }
        // Collect all coordinates. It's safe to assume parsers provide x, y, z as numbers.
        // They might be undefined/NaN if parsing fails for a coordinate, which is fine.
        const xCoords = atoms.map((a) => a.x);
        const yCoords = atoms.map((a) => a.y);
        const zCoords = atoms.map((a) => a.z);
        // A file is flat if one of the coordinate axes is all zeros (or undefined/NaN for all atoms).
        // The .every check handles undefined and NaN correctly, as they are not equal to 0.
        const allXZero = xCoords.every((c) => c === 0);
        const allYZero = yCoords.every((c) => c === 0);
        const allZZero = zCoords.every((c) => c === 0);
        return allXZero || allYZero || allZZero;
    }
    /**
     * Builds a spatial grid for the atoms in this parser.
     *
     * @param {number} stride The stride to use when iterating atoms.
     * @param {number} cellSize The size of each grid cell (should match query distance).
     * @returns {Map<string, number[]>} A map where keys are "x,y,z" indices and values are arrays of atom indices.
     */
    private _buildSpatialGrid(
        stride: number,
        cellSize: number
    ): Map<string, number[]> {
        const grid = new Map<string, number[]>();
        for (let i = 0; i < this.length; i += stride) {
            const atom = this.getAtom(i);
            if (
                atom.x === undefined ||
                atom.y === undefined ||
                atom.z === undefined
            ) {
                continue;
            }
            const cx = Math.floor(atom.x / cellSize);
            const cy = Math.floor(atom.y / cellSize);
            const cz = Math.floor(atom.z / cellSize);
            const key = `${cx},${cy},${cz}`;
            if (!grid.has(key)) {
                grid.set(key, []);
            }
            grid.get(key)!.push(i);
        }
        return grid;
    }

    /**
     * Test whether (x, y, z) lies within the cutoff of any atom held in a
     * spatial grid. The grid must use `cellSize` as its cell width so every
     * atom within the cutoff falls in the 27 cells around the point's cell.
     *
     * Shared kernel for the grid-based proximity scans in isWithinDistance and
     * residuesWithinDistanceOf.
     *
     * @param {number} x Query x coordinate.
     * @param {number} y Query y coordinate.
     * @param {number} z Query z coordinate.
     * @param {Map<string, number[]>} grid Cell-key -> atom indices, from _buildSpatialGrid.
     * @param {EasyParserParent} gridParser Parser owning the gridded atoms (for index lookup).
     * @param {number} cellSize Grid cell width; must equal the grid's build cell size.
     * @param {number} distanceSqThreshold Squared cutoff distance.
     * @returns {boolean} True if any gridded atom is within the cutoff.
     */
    private _atomNearGriddedSet(
        x: number,
        y: number,
        z: number,
        grid: Map<string, number[]>,
        gridParser: EasyParserParent,
        cellSize: number,
        distanceSqThreshold: number
    ): boolean {
        const cx = Math.floor(x / cellSize);
        const cy = Math.floor(y / cellSize);
        const cz = Math.floor(z / cellSize);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const cellKey = `${cx + dx},${cy + dy},${cz + dz}`;
                    const binIndices = grid.get(cellKey);
                    if (!binIndices) {
                        continue;
                    }
                    for (const idx of binIndices) {
                        const gAtom = gridParser.getAtom(idx);
                        const ddx = x - (gAtom.x as number);
                        const ddy = y - (gAtom.y as number);
                        const ddz = z - (gAtom.z as number);
                        if (
                            ddx * ddx + ddy * ddy + ddz * ddz <=
                            distanceSqThreshold
                        ) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * Determine whether any atom in this parser lies within `distance` of any
     * atom in `otherParser`. Applies a bounding-box early-out; for larger
     * inputs it grids the bigger set and queries with the smaller, otherwise it
     * falls back to a pruned brute-force comparison.
     *
     * @param {EasyParserParent} otherParser The parser to compare against.
     * @param {number} distance The cutoff distance in Angstroms.
     * @param {number} [selfStride] Sample every Nth atom of this parser (>= 1).
     * @param {number} [otherStride] Sample every Nth atom of otherParser (>= 1).
     * @returns {boolean} True if any atom pair is within the cutoff.
     */
    isWithinDistance(
        otherParser: EasyParserParent,
        distance: number,
        selfStride = 1,
        otherStride = 1
    ): boolean {
        if (selfStride < 1) {
            throw new Error("selfStride must be >= 1");
        }
        if (otherStride < 1) {
            throw new Error("otherStride must be >= 1");
        }
        const distanceSqThreshold = distance * distance;
        const bounds1 = this.getBounds(selfStride);
        const bounds2 = otherParser.getBounds(otherStride);
        if (!bounds1 || !bounds2) {
            return false;
        }
        if (
            bounds1.maxX < bounds2.minX - distance ||
            bounds1.minX > bounds2.maxX + distance ||
            bounds1.maxY < bounds2.minY - distance ||
            bounds1.minY > bounds2.maxY + distance ||
            bounds1.maxZ < bounds2.minZ - distance ||
            bounds1.minZ > bounds2.maxZ + distance
        ) {
            return false;
        }
        const count1 = Math.ceil(this.length / selfStride);
        const count2 = Math.ceil(otherParser.length / otherStride);
        if (count1 * count2 > 5000) {
            // Grid the larger set and query with the smaller for fewer tests.
            let gridParser: EasyParserParent;
            let queryParser: EasyParserParent;
            let gridStride: number;
            let queryStride: number;
            if (count1 >= count2) {
                gridParser = this;
                gridStride = selfStride;
                queryParser = otherParser;
                queryStride = otherStride;
            } else {
                gridParser = otherParser;
                gridStride = otherStride;
                queryParser = this;
                queryStride = selfStride;
            }
            const grid = gridParser._buildSpatialGrid(gridStride, distance);
            for (let i = 0; i < queryParser.length; i += queryStride) {
                const qAtom = queryParser.getAtom(i);
                if (
                    qAtom.x === undefined ||
                    qAtom.y === undefined ||
                    qAtom.z === undefined
                ) {
                    continue;
                }
                if (
                    this._atomNearGriddedSet(
                        qAtom.x,
                        qAtom.y,
                        qAtom.z,
                        grid,
                        gridParser,
                        distance,
                        distanceSqThreshold
                    )
                ) {
                    return true;
                }
            }
            return false;
        }
        // Small inputs: pruned brute-force comparison.
        for (let i = 0; i < this.length; i += selfStride) {
            const atom1 = this.getAtom(i);
            if (
                atom1.x === undefined ||
                atom1.y === undefined ||
                atom1.z === undefined
            ) {
                continue;
            }
            const x1 = atom1.x;
            const y1 = atom1.y;
            const z1 = atom1.z;
            for (let j = 0; j < otherParser.length; j += otherStride) {
                const atom2 = otherParser.getAtom(j);
                if (
                    atom2.x === undefined ||
                    atom2.y === undefined ||
                    atom2.z === undefined
                ) {
                    continue;
                }
                const x2 = atom2.x;
                const dx = x1 - x2;
                const dxSq = dx * dx;
                if (dxSq > distanceSqThreshold) {
                    continue;
                }
                const y2 = atom2.y;
                const dy = y1 - y2;
                const dySq = dy * dy;
                if (dxSq + dySq > distanceSqThreshold) {
                    continue;
                }
                const z2 = atom2.z;
                const dz = z1 - z2;
                const dzSq = dz * dz;
                const distanceSq = dxSq + dySq + dzSq;
                if (distanceSq <= distanceSqThreshold) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Build a reusable proximity grid over this parser's atoms. When querying
     * many sets against one fixed set (e.g. every protein against all ligands),
     * build the grid once and reuse it rather than rebuilding per query.
     *
     * @param distance Cutoff in Angstroms; also the grid cell width.
     * @param stride Sample every Nth atom (>= 1).
     * @returns A probe usable with residuesNearGrid.
     */
    public buildProximityGrid(distance: number, stride = 1): IProximityGrid {
        return {
            grid: this._buildSpatialGrid(stride, distance),
            parser: this,
            distance,
        };
    }

    /**
     * Collect the residues of this parser that have any atom within the probe's
     * cutoff of any atom in the probe's gridded set. Once a residue qualifies,
     * its remaining atoms are skipped.
     *
     * @param probe A grid built with buildProximityGrid.
     * @returns The unique residues within the cutoff.
     */
    public residuesNearGrid(probe: IProximityGrid): IResidueId[] {
        const found = new Map<string, IResidueId>();
        if (this.length === 0) {
            return [];
        }
        const distSqThreshold = probe.distance * probe.distance;
        for (let i = 0; i < this.length; i++) {
            const atom = this.getAtom(i);
            if (
                atom.x === undefined ||
                atom.y === undefined ||
                atom.z === undefined
            ) {
                continue;
            }
            const residueKey = `${atom.chain ?? ""}:${atom.resi}`;
            // The residue is already in the pocket; its other atoms cannot
            // change the outcome.
            if (found.has(residueKey)) {
                continue;
            }
            if (
                this._atomNearGriddedSet(
                    atom.x,
                    atom.y,
                    atom.z,
                    probe.grid,
                    probe.parser,
                    probe.distance,
                    distSqThreshold
                )
            ) {
                found.set(residueKey, {
                    chain: atom.chain ?? "",
                    resi: atom.resi,
                });
            }
        }
        return Array.from(found.values());
    }

    /**
     * Find the residues of this parser within `distance` of any atom in
     * `otherParser`. Convenience wrapper that grids `otherParser` for a single
     * query; for repeated queries against the same set, build the grid once
     * with buildProximityGrid and call residuesNearGrid.
     *
     * @param otherParser The parser whose atoms define proximity (e.g. ligand).
     * @param distance The cutoff distance in Angstroms.
     * @returns The unique residues of this parser within the cutoff.
     */
    public residuesWithinDistanceOf(
        otherParser: EasyParserParent,
        distance: number
    ): IResidueId[] {
        if (this.length === 0 || otherParser.length === 0) {
            return [];
        }
        return this.residuesNearGrid(otherParser.buildProximityGrid(distance));
    }

    /**
     * Extracts all unique residue names (resn) and residue IDs (resi) from the
     * atoms in this parser.
     *
     * @returns {{ names: Set<string>, ids: Set<number> }} An object containing a
     *  Set of unique residue names and a Set of unique residue IDs.
     */
    public getUniqueResidues(): { names: Set<string>; ids: Set<number> } {
        const residueNames = new Set<string>();
        const residueIds = new Set<number>();
        for (let i = 0; i < this.length; i++) {
            try {
                const atom = this.getAtom(i);
                if (atom.resn) {
                    residueNames.add(atom.resn);
                }
                if (atom.resi !== undefined) {
                    // Assuming resi is a number. If it could be a string, adjust accordingly.
                    residueIds.add(atom.resi);
                }
            } catch {
                // Skip atoms that fail to parse
                continue;
            }
        }
        return { names: residueNames, ids: residueIds };
    }

    /**
     * Checks if the molecule contains any hydrogen atoms.
     *
     * @returns {boolean} True if at least one hydrogen atom is found, false otherwise.
     */
    public hasHydrogens(): boolean {
        // Use .some for efficiency, as it will stop as soon as a hydrogen is found.
        return this.atoms.some((atom) => atom.elem?.toUpperCase() === "H");
    }

    /**
     * Get the approximate bounds of the molecule. NOTE: This code not used, but
     * could be useful in the future.
     *
     * @returns {number[]} The approximate bounds [minX, minY, minZ, maxX, maxY,
     *     maxZ].
     */
    //     getApproximateBounds(): [number, number, number, number, number, number] {
    //         let minX = Infinity;
    //         let minY = Infinity;
    //         let minZ = Infinity;
    //         let maxX = -Infinity;
    //         let maxY = -Infinity;
    //         let maxZ = -Infinity;

    //         const buffer = 5;
    //         const step = 10;

    //         for (let i = 0; i < this.length; i += step) {
    //             const atom = this.getAtom(i);

    //             minX = Math.min(minX, atom.x as number);
    //             minY = Math.min(minY, atom.y as number);
    //             minZ = Math.min(minZ, atom.z as number);
    //             maxX = Math.max(maxX, atom.x as number);
    //             maxY = Math.max(maxY, atom.y as number);
    //             maxZ = Math.max(maxZ, atom.z as number);
    //         }

    //         return [
    //             minX - buffer,
    //             minY - buffer,
    //             minZ - buffer,
    //             maxX + buffer,
    //             maxY + buffer,
    //             maxZ + buffer,
    //         ];
    //     }
}
