import {
    GLModel,
    IAtom,
    IMolContainer,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    solventSel,
    standardProteinResidues,
} from "../Definitions/ComponentSelections";

// Inspired by
// https://github.com/MDAnalysis/mdanalysis/blob/f542aa485983f8d3dd250b36a886061f696c3e97/package/MDAnalysis/coordinates/PDB.py#L576

const _twoLetterElems = [
    "AL",
    "AS",
    "AU",
    "BE",
    "BR",
    "CL",
    "CO",
    "CU",
    "EU",
    "FE",
    "GD",
    "HG",
    "IR",
    "MG",
    "MN",
    "MO",
    "NI",
    "PT",
    "RH",
    "RU",
    "SE",
    "TA",
    "ZN",
];

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
        str = str + " ";
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

    if (atomName.length >= 4) {
        // Note this also converts atom names that take up the whole four
        // characters.
        return atomName.substring(0, 4);
    }

    if (atomName.length === 1) {
        return ` ${atomName}  `;
    }

    if (element) {
        if (element.length === 2) {
            // Assume first two letters are the element
            return _ljust(atomName, 4);
        }
        if (element.length === 1) {
            // Assume first letter is the element
            return " " + _ljust(atomName, 3);
        }
    } else {
        // Element is unknown.
        if (
            _twoLetterElems.indexOf(atomName.substring(0, 2).toUpperCase()) !==
            -1
        ) {
            return _ljust(atomName, 4);
        }
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
    pdbLine += _rjust((atom.b as number).toFixed(2), 6);
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (mol.selectedAtoms) {
        // It's GLModel
        return (mol as GLModel).selectedAtoms({});
    }

    return mol as IAtom[];
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
        if (chainsAvailable.has(atoms[0].chain)) {
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
 * convertMolContainer() to this one. Probably should not call this function
 * directly.
 *
 * @param  {IMolContainer[]} molContainers  The list of mol containers.
 * @param  {boolean}         [merge=false]  Whether to merge the models into a
 *                                          single PDB string.
 * @returns {string[]} The PDB strings.
 */
export function convertMolContainersToPDB(
    molContainers: IMolContainer[],
    merge = false
): string[] {
    let mols = molContainers.map((molContainer) => molContainer.model) as
        | GLModel[]
        | IAtom[][];
    // mol is 3dmoljs molecule object.

    const pdbTxts: string[] = [];
    const conectTxts: string[] = [];

    if (merge) {
        mols = [_mergeMols(mols)];
    }

    // let curSerial = 1;

    for (const mol of mols) {
        const atoms: IAtom[] = _getAtomsOfModel(mol);
        const atomsToConect: IAtom[] = [];
        const pdbLines: string[] = [];

        for (const atom of atoms) {
            // See https://www.cgl.ucsf.edu/chimera/docs/UsersGuide/tutorials/pdbintro.html

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

// NOTE: Let's use openbabel to generate mol2 files. It's easier. Below ALMOST
// works. But doesn't detect aromatic bonds. Also, charges not implemented,
// though that is stored in GLModel. But Open Babel will just be better.

// function getSyblType(atom: IAtom): string {
//     const elem = atom.elem?.toUpperCase() as string;

//     // Note: You can't determine hybridization based on number of bonds because
//     // I don't know if you'll have hydrogen atoms added. Below is imperfect, but
//     // close enough I think.

//     switch (elem) {
//         case "C":
//             if (atom.bondOrder.indexOf(3) !== -1) {
//                 return "C.1";
//             } else if (atom.bondOrder.indexOf(2) !== -1) {
//                 return "C.2";
//             }
//             return "C.3";
//         case "N":
//             if (atom.bondOrder.indexOf(3) !== -1) {
//                 return "N.1";
//             } else if (atom.bondOrder.indexOf(2) !== -1) {
//                 return "N.2";
//             }
//             return "N.3";
//         case "O":
//             if (atom.bondOrder.indexOf(2) !== -1) {
//                 return "O.2";
//             }
//             return "O.3";
//         case "S":
//             if (atom.bondOrder.indexOf(2) !== -1) {
//                 return "S.2";
//             }
//             return "S.3";
//         case "P":
//             // The only one for P?
//             // https://tccc.iesl.forth.gr/education/local/quantum/molecular_modeling/guide_documents/SYBYL_data_document.html
//             return "P.3";
//         default:
//             return elem.toUpperCase();
//     }
// }

// /**
//  * Given a list of mol containers, convert them to MOL2 format. Prefer the
//  * convertMolContainer() to this one. Probably should not call this function
//  * directly.
//  *
//  * @param  {IMolContainer[]} molContainers  The list of mol containers.
//  * @param  {boolean}         [merge=false]  Whether to merge the models into a
//  *                                          single PDB string.
//  * @returns {string[]} The Mol2 strings.
//  */
// export function convertMolContainersToMol2(
//     molContainers: IMolContainer[],
//     merge = false // TODO:
// ): string[] {
//     let mols = molContainers.map((molContainer) => molContainer.model) as
//         | GLModel[]
//         | IAtom[][];
//     // mol is 3dmoljs molecule object.

//     const mol2Txts: string[] = [];

//     if (merge) {
//         mols = [_mergeMols(mols)];
//     }

//     // let curSerial = 1;

//     for (const mol of mols) {
//         const atoms: IAtom[] = getAtomsOfModel(mol);

//         const resname = (atoms[0].resn === undefined) ? "MOL" : atoms[0].resn;

//         let mol2Txt = "@<TRIPOS>MOLECULE\n";
//         mol2Txt += `${resname}\n`; // TODO: Get better name

//         const numAtoms = atoms.length;
//         const uniqBonds: Set<string> = new Set();
//         for (const atom of atoms) {
//             const bonds = atom.bonds as number[];
//             for (let bondIdx = 0; bondIdx < bonds.length; bondIdx++) {
//                 const bondedAtomIdx = bonds[bondIdx];
//                 const bondOrder = atom.bondOrder[bondIdx];
//                 const data = [atom.index, bondedAtomIdx].sort();
//                 data.push(bondOrder);
//                 uniqBonds.add(data.join("-"));
//             }
//         }

//         mol2Txt += ` ${numAtoms} ${uniqBonds.size} 0 0 0\n`;
//         mol2Txt += "SMALL\n";
//         mol2Txt += "USER_CHARGES\n";
//         mol2Txt += "****\n";
//         mol2Txt += "COMMENT\n\n"; // TODO: Implement
//         mol2Txt += "@<TRIPOS>ATOM\n";

//         for (const atom of atoms) {
//             const idxStr = _rjust(((atom.index as number) + 1).toString(), 7);
//             const elemStr = _ljust(atom.elem?.toUpperCase() as string, 8);
//             const xStr = _rjust(atom.x?.toFixed(4) as string, 9);
//             const yStr = _rjust(atom.y?.toFixed(4) as string, 9);
//             const zStr = _rjust(atom.z?.toFixed(4) as string, 9);
//             const typeStr = _ljust(getSyblType(atom) as string, 7);
//             const chargeStr = "0.0000"; // TODO: implement
//             mol2Txt += `${idxStr} ${elemStr} ${xStr} ${yStr} ${zStr} ${typeStr} 1  ${_ljust(resname, 11)} ${chargeStr}\n`;
//         }

//         mol2Txt += "@<TRIPOS>BOND\n";
//         let bondIdx = 1;
//         for (const bond of uniqBonds) {
//             const [atom1Idx, atom2Idx, bondOrder] = bond
//                 .split("-")
//                 .map((x) => parseInt(x));
//             const idxStr = _rjust(bondIdx.toString(), 6);
//             const atom1IdxStr = _rjust((atom1Idx + 1).toString(), 5);
//             const atom2IdxStr = _rjust((atom2Idx + 1).toString(), 5);
//             const bondOrderStr = _rjust(bondOrder.toString(), 4);
//             mol2Txt += `${idxStr} ${atom1IdxStr} ${atom2IdxStr} ${bondOrderStr}\n`;
//             bondIdx += 1;
//         }

//         mol2Txts.push(mol2Txt);
//     }

//     return mol2Txts;
// }
