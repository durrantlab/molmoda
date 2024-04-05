import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { GLModel } from "@/UI/Panels/Viewer/GLModelType";
import {
    standardProteinResidues,
    solventSel,
} from "../Types/ComponentSelections";
import { makeEasyParser } from "../ParseMolModels/EasyParser";
import { twoLetterElems } from "../NameVars";

const chainOptions = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
];

/**
 * Aligns a string to the right.
 *
 * @param  {string} str   The string to align.
 * @param  {number} width The width to align to.
 * @returns {string} The aligned string.
 */
function _rjust(str: string, width: number): string {
    while (str.length < width) {
        str = " " + str;
    }
    str = str.substring(str.length - width);
    return str;
}
/**
 * Aligns a string to the left.
 *
 * @param  {string} str   The string to align.
 * @param  {number} width The width to align to.
 * @returns {string} The aligned string.
 */
function _ljust(str: string, width: number): string {
    while (str.length < width) {
        str += " ";
    }
    str = str.substring(0, width);
    return str;
}

/**
 * Gets an atom name suitable for use in a PDB line.
 *
 * @param  {string} atomName  The atom name.
 * @param  {string} [element] The element, optional.
 * @returns {string} The PDB atom name.
 */
function _alignAtomName(atomName: string, element?: string): string {
    // Inspired by
    // https://github.com/MDAnalysis/mdanalysis/blob/f542aa485983f8d3dd250b36a886061f696c3e97/package/MDAnalysis/coordinates/PDB.py#L997

    if (atomName === "") {
        return "";
    }

    // Note this also converts atom names that take up the whole four
    // characters.
    if (atomName.length >= 4) {
        return atomName.substring(0, 4);
    }

    if (atomName.length === 1) {
        return ` ${atomName}  `;
    }

    if (element) {
        // Assume first two letters are the element
        if (element.length === 2) {
            return _ljust(atomName, 4);
        }

        // Assume first letter is the element
        if (element.length === 1) {
            return " " + _ljust(atomName, 3);
        }
    } else if (
        twoLetterElems.indexOf(atomName.substring(0, 2).toUpperCase()) !== -1
    ) {
        // Element is unknown.
        return _ljust(atomName, 4);
    }

    return _rjust(atomName, 4);
}

/**
 * Create a single line of PDB text.
 *
 * @param  {boolean} isProt  Whether the line is for a protein.
 * @param  {IAtom}   atom    The atom to create the line for.
 * @returns {string}  The PDB line.
 */
function _createPDBLine(isProt: boolean, atom: IAtom): string {
    // Add defaults to atom
    atom.serial = atom.serial === undefined ? 0 : atom.serial;
    atom.atom = atom.atom === undefined ? "C" : atom.atom;
    atom.elem = atom.elem === undefined ? "C" : atom.elem;
    atom.altLoc = atom.altLoc === undefined ? " " : atom.altLoc;
    atom.resn = atom.resn === undefined ? "MOL" : atom.resn;
    atom.chain = atom.chain === undefined ? "A" : atom.chain;
    atom.resi = atom.resi === undefined ? 1 : atom.resi;
    atom.x = atom.x === undefined ? 0 : atom.x;
    atom.y = atom.y === undefined ? 0 : atom.y;
    atom.z = atom.z === undefined ? 0 : atom.z;
    atom.b = atom.b === undefined ? 0 : atom.b;

    let pdbLine = _ljust(isProt ? "ATOM" : "HETATM", 6);
    pdbLine += _rjust((atom.serial as number).toString(), 5);
    pdbLine += " ";
    pdbLine += _alignAtomName(atom.atom as string, atom.elem);
    pdbLine += atom.altLoc; // altloc
    pdbLine += _rjust(atom.resn, 3);
    pdbLine += _rjust(atom.chain, 2);
    pdbLine += _rjust(atom.resi.toString(), 4);
    pdbLine += " "; // atom.ins?
    pdbLine += _rjust((atom.x as number).toFixed(3), 11);
    pdbLine += _rjust((atom.y as number).toFixed(3), 8);
    pdbLine += _rjust((atom.z as number).toFixed(3), 8);
    pdbLine += _rjust("1.00", 6); // occupancy
    pdbLine += _rjust((atom.b ? (atom.b as number) : 0).toFixed(2), 6);
    pdbLine += _rjust(" ", 10); // Segment identifier is obsolete
    pdbLine += _rjust(atom.elem?.toUpperCase() as string, 2);
    return pdbLine;
}

/**
 * Gets a list of atoms from GLModel or atom list.
 *
 * @param  {GLModel|IAtom[]} mol  The GLModel or atom list.
 * @returns {IAtom[]}  The list of atoms.
 */
function _getAtomsOfModel(mol: GLModel | IAtom[]): IAtom[] {
    return makeEasyParser(mol).atoms;
}

/**
 * Merges multiple molecules into one, reindexing the atoms, making sure chains
 * are unique, etc.
 *
 * @param  {GLModel[]|IAtom[][]} mols  The molecules to merge.
 * @returns {IAtom[]}  The list of atoms.
 */
function _mergeMols(mols: GLModel[] | IAtom[][]): IAtom[] {
    let curIdx = 0;
    let curSerial = 1;
    const chainsAvailable: Set<string> = new Set(chainOptions);
    const allAtoms: IAtom[] = [];

    for (const mol of mols) {
        // Get the atomselection of the model.
        const atoms = _getAtomsOfModel(mol);

        // Get the chain to use.
        let curChain: string;
        if (atoms[0] && atoms[0].chain && chainsAvailable.has(atoms[0].chain)) {
            // The current chain is one that's availble. So use that.
            curChain = atoms[0].chain;
        } else {
            // Current chain has already been used (by different molecule). So
            // pick another one from the chainsAvailable set.
            curChain = chainsAvailable.values().next().value;
        }
        chainsAvailable.delete(curChain);

        const firstIndex = curIdx;

        for (const atom of atoms) {
            const atomCopy: IAtom = { ...atom };
            atomCopy.chain = curChain;
            atomCopy.serial = curSerial;
            atomCopy.index = curIdx;
            // atomCopy.bondOrder = [];
            atomCopy.bonds = atomCopy.bonds?.map((idx) => idx + firstIndex);
            curSerial += 1;
            curIdx += 1;
            allAtoms.push(atomCopy);
        }
    }

    return allAtoms;
}

/**
 * Given a list of mol containers, convert them to PDB format. Prefer the
 * TreeNodeList.toFileInfos() to this one. Do not call this function directly.
 *
 * @param  {TreeNodeList} treeNodeList  The list of mol containers.
 * @param  {boolean}         [merge=false]  Whether to merge the models into a
 *                                          single PDB string.
 * @returns {string[]} The PDB strings.
 */
export function _convertTreeNodeListToPDB(
    treeNodeList: TreeNodeList,
    merge = false
): string[] {
    let mols = treeNodeList.filters
        .keepModels()
        .map((treeNode: TreeNode) => treeNode.model as GLModel | IAtom[]);
    // .filhter((mol) => Array.isArray(mol) && mol.length > 0);
    // mol is 3dmoljs molecule object.

    if (mols.length === 0) {
        return [""];
    }

    const pdbTxts: string[] = [];
    const conectTxts: string[] = [];

    if (merge) {
        // Note that this converts mols from array to models (GLModel), to
        // arrays of atoms. But should still work.
        mols = [_mergeMols(mols as GLModel[] | IAtom[][])];
    }

    // let curSerial = 1;

    for (const mol of mols) {
        const atoms: IAtom[] = _getAtomsOfModel(mol);
        const atomsToConect: IAtom[] = [];
        const pdbLines: string[] = [];

        for (const atom of atoms) {
            // See https://www.cgl.ucsf.edu/chimera/docs/UsersGuide/tutorials/pdbintro.html

            // Note that bonds are not implemented given new EasyParser
            // replacement for GLModel.

            const isProt = standardProteinResidues.indexOf(atom.resn) !== -1;
            const pdbLine = _createPDBLine(isProt, atom);

            if (
                !isProt &&
                (atom.bonds as number[]).length > 0 &&
                solventSel.resn.indexOf(atom.resn) === -1
            ) {
                atomsToConect.push(atom);
            }

            // Note: SSBOND not implemented

            pdbLines.push(pdbLine);
        }
        pdbTxts.push(pdbLines.join("\n"));

        const conects: string[] = [];
        for (const atom of atomsToConect) {
            let conect = "CONECT";
            conect += _rjust((atom.serial as number).toString(), 5);
            for (const bondedAtomIdx of atom.bonds as number[]) {
                if (atoms[bondedAtomIdx] === undefined) {
                    continue;
                }

                const bondedAtomSerial = atoms[bondedAtomIdx].serial as number;
                conect += _rjust(bondedAtomSerial.toString(), 5);
            }
            conects.push(conect);
        }
        conectTxts.push(conects.join("\n"));
    }

    if (!merge) {
        // Zip the pdb and conect files together.
        return pdbTxts.map((pdb, i) => {
            return pdb + "\n" + conectTxts[i];
        });
    }

    // Merge the PDB files all together.
    return [pdbTxts.join("\nTER\n") + "\n" + conectTxts.join("\n")];
}
