import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    solventSel,
    standardProteinResidues,
} from "./Lookups/ComponentSelections";

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

function _rjust(str: string, width: number) {
    while (str.length < width) {
        str = " " + str;
    }
    str = str.substring(str.length - width);
    return str;
}

function _ljust(str: string, width: number) {
    while (str.length < width) {
        str = str + " ";
    }
    str = str.substring(0, width);
    return str;
}

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

export function convertToPDB(mols: any[], merge = false): string[] {
    // mol is 3dmoljs molecule object.

    const pdbTxts: string[] = [];
    const conectTxts: string[] = [];

    let curSerial = 1;

    mols.forEach((mol: any) => {
        const atoms: IAtom[] = mol.selectedAtoms({});
        const atomsToConect: IAtom[] = [];
        const pdbLines: string[] = [];

        atoms.forEach((atom: IAtom) => {
            // See https://www.cgl.ucsf.edu/chimera/docs/UsersGuide/tutorials/pdbintro.html

            const isProt = standardProteinResidues.indexOf(atom.resn) !== -1;
            if (merge) {
                atom.serial = curSerial;
                curSerial++;
            }

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

            if (
                !isProt &&
                (atom.bonds as number[]).length > 0 &&
                solventSel.resn.indexOf(atom.resn) === -1
            ) {
                atomsToConect.push(atom);
            }

            // Note: SSBOND not implemented

            pdbLines.push(pdbLine);
        });
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
    });

    if (!merge) {
        // Zip the pdb and conect files together.
        return pdbTxts.map((pdb, i) => {
            return pdb + "\n" + conectTxts[i];
        });
    }

    // Merge the PDB files all together.
    return [pdbTxts.join("\nTER\n") + "\n" + conectTxts.join("\n")];
}

// export function convertToMol2(mol: any): string {
//     // NOTE: Let's use openbabel to generate mol2 files. It's easier.
// }