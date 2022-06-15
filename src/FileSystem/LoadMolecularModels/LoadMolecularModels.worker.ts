/* eslint-disable */

import {
    sendResponseToMainThread,
    waitForDataFromMainThread,
} from "@/Core/WebWorkers/WorkerHelper";

// @ts-ignore
import * as tmp from "@/UI/Viewer/3Dmol-nojquery.JDD";
import { ionSel, lipidSel, metalSel, nucleicSel, proteinSel, solventSel } from "./Lookups/ComponentSelections";
import { ionsStyle, ligandsStyle, lipidStyle, metalsStyle, nucleicStyle, proteinStyle, solventStyle } from "./Lookups/DefaultStyles";
import { IAtom, IChain, IFileContents, IMolEntry, IResidue, IStyle, MolType } from "../../UI/TreeView/TreeInterfaces";
import { getTerminalNodes } from "@/UI/TreeView/TreeUtils";
import { randomID } from "@/Core/Utils";
const $3Dmol = (tmp as any);

let glviewer: any;

function organizeSelByChain(sel: any, mol: any, entryName: string): IMolEntry {
    const selectedAtoms = mol.selectedAtoms(sel);
    const molEntry: IMolEntry = {
        text: entryName,
        chains: [],
    }
    let lastChainID: string = "";
    selectedAtoms.forEach((atom: IAtom) => {
        if (atom.chain !== lastChainID) {
            // @ts-ignore
            molEntry.chains.push({
                text: atom.chain,
                atoms: [],
            });
            lastChainID = atom.chain;
        }

        // @ts-ignore
        molEntry.chains[molEntry.chains.length - 1].atoms.push(atom);
    });
    mol.removeAtoms(selectedAtoms);

    return molEntry;
}

function flattenChains(molEntry: IMolEntry): IMolEntry {
    if (!molEntry.chains) { 
        throw new Error("No chains found in molEntry.");
    }
    const flattened: IMolEntry = {
        text: molEntry.text,
        atoms: [],
    }
    molEntry.chains.forEach((chain: IChain) => {
        if (!chain.atoms) { 
            throw new Error("No atoms found in chain.");
        }
        // @ts-ignore
        flattened.atoms.push(...chain.atoms);
    });
    return flattened;
}

function residueID(atom: IAtom): string {
    return atom.resn + ":" + atom.resi;
}

function divideChainsIntoResidues(molEntry: IMolEntry): IMolEntry {
    if (!molEntry.chains) { return molEntry; }

    const dividedMolEntry: IMolEntry = {
        text: molEntry.text,
        chains: [],
    }
    let lastChainID: string = "";
    molEntry.chains.forEach((chain: IChain) => {
        if (!chain.atoms) { return; }  // Already divided apparently.

        if (chain.text !== lastChainID) {
            // @ts-ignore
            dividedMolEntry.chains.push({
                text: chain.text,
                residues: [],
            });
            lastChainID = chain.text;
        }
        let lastResidueID: string = "";
        chain.atoms.forEach((atom: IAtom) => {
            let chains = dividedMolEntry.chains;
            if (!chains) {
                throw new Error("No chains found in dividedMolEntry.");
            }
            let residues = chains[chains.length - 1].residues;
            if (!residues) {
                // Always exists. This here only to satisfy typechecker.
                throw new Error("No residues found in dividedMolEntry.");
            }

            let newKey = residueID(atom);
            if (newKey !== lastResidueID) {
                residues.push({
                    text: newKey,
                    atoms: [],
                });
                lastResidueID = newKey;
            }
            let lastResidueIdx = residues.length - 1;
            let atoms = residues[lastResidueIdx].atoms;
            if (atoms) {
                atoms.push(atom);
            }
        });
    });
    return dividedMolEntry;
}

// If any key is associated with a list of length 1, collapse it so the key is merged with the key one up.
function collapseSingleResidueChains(molEntry: IMolEntry): IMolEntry {
    // First collapse single residues into chains
    if (molEntry.chains) {
        molEntry.chains.forEach((chain: IChain) => {
            if (chain.residues && chain.residues.length === 1) {
                const onlyResidue = chain.residues[0];
                if (onlyResidue.atoms) {
                    const atomsOfOnlyResidue: IAtom[] = onlyResidue.atoms;
                    chain.text = onlyResidue.text + ":" + chain.text;
                    chain.atoms = atomsOfOnlyResidue;
                    delete chain.residues;
                }
            } else if (chain.atoms && chain.atoms.length === 1) {
                const onlyAtom = chain.atoms[0];
                chain.text = residueID(onlyAtom) + ":" + chain.text;
            }
        });
    }

    // Then collapse single chains into molecules
    if (molEntry.chains && molEntry.chains.length === 1) {
        const onlyChain = molEntry.chains[0];
        if (onlyChain.atoms) {
            const atomsOfOnlyChain: IAtom[] = onlyChain.atoms;
            molEntry.atoms = atomsOfOnlyChain;
            molEntry.text = onlyChain.text + " (" + molEntry.text + ")";
            delete molEntry.chains;
        }
    }

    return molEntry;
}

function addMolTypeAndStyle(molEntry: IMolEntry, styles: IStyle[], idx: number): any[] {
    let pathToId: any[] = [];
    let molType = molEntry.type;
    for (const leaf of getTerminalNodes([molEntry], [idx])) {
        leaf.mol.type = molType;
        leaf.mol.styles = styles;
        leaf.mol.id = randomID();
        pathToId.push([leaf.idxPath, leaf.mol.id]);
    }
    return pathToId;
}

function divideAtomsIntoDistinctComponents(data: {[key:string]: any}): IFileContents {
    // This that are bonded to each other are considered to be in the same
    // component.

    // glviewer for use in webworker.
    if (!glviewer) { glviewer = $3Dmol.createViewer("", {}); }
    let mol = glviewer.makeGLModel_JDD(data.molText, data.format);

    let proteinAtomsByChain: IMolEntry = organizeSelByChain(proteinSel, mol, "Protein");
    let nucleicAtomsByChain: IMolEntry = organizeSelByChain(nucleicSel, mol, "Nucleic");
    let solventAtomsByChain: IMolEntry = organizeSelByChain(solventSel, mol, "Solvent");
    let metalAtomsByChain: IMolEntry = organizeSelByChain(metalSel, mol, "Metals");
    let ionAtomsByChain: IMolEntry = organizeSelByChain(ionSel, mol, "Ions");
    let lipidAtomsByChain: IMolEntry = organizeSelByChain(lipidSel, mol, "Lipids");
    let ligandsByChain: IMolEntry = organizeSelByChain({}, mol, "Compounds");  // Everything else is ligands

    // Further divide by residue (since likely each ligand is on its own
    // residue, not bound to any other).
    ligandsByChain = divideChainsIntoResidues(ligandsByChain);

    // Solvent and ions don't need to be divided by chain.
    let solventAtomsNoChain: IMolEntry = flattenChains(solventAtomsByChain);
    let ionAtomsNoChain: IMolEntry = flattenChains(ionAtomsByChain);
    
    // For everything else, if given chain has only one item, collapse it.
    ligandsByChain = collapseSingleResidueChains(ligandsByChain);
    proteinAtomsByChain = collapseSingleResidueChains(proteinAtomsByChain);
    nucleicAtomsByChain = collapseSingleResidueChains(nucleicAtomsByChain);
    metalAtomsByChain = collapseSingleResidueChains(metalAtomsByChain);
    lipidAtomsByChain = collapseSingleResidueChains(lipidAtomsByChain);

    proteinAtomsByChain.type = MolType.PROTEIN;
    nucleicAtomsByChain.type = MolType.NUCLEIC;
    ligandsByChain.type = MolType.LIGAND;
    metalAtomsByChain.type = MolType.METAL;
    lipidAtomsByChain.type = MolType.LIPID;
    ionAtomsNoChain.type = MolType.IONS;
    solventAtomsNoChain.type = MolType.SOLVENT;

    // // add in default styles
    // proteinAtomsByChain.style = proteinStyle;
    // nucleicAtomsByChain.style = nucleicStyle;

    // Page into single object
    let fileContents: IFileContents = {
        text: data.molName,
        mols: [
            proteinAtomsByChain,
            nucleicAtomsByChain,
            ligandsByChain,
            metalAtomsByChain,
            lipidAtomsByChain,
            ionAtomsNoChain,
            solventAtomsNoChain,
        ]
    }

    // Iterate through organizedAtoms. If object and has no keys, remove it. If
    // list and has length 0, remove it.
    if (fileContents.mols) {
        fileContents.mols = fileContents.mols.filter((m: IMolEntry) => {
            let totalSubItems = 0;
            if (m.chains) { totalSubItems += m.chains.length; }
            if (m.atoms) { totalSubItems += m.atoms.length; }
            return totalSubItems > 0;
        });
    }

    return fileContents;
}

function makeTreeViewData(organizedAtoms: IFileContents): IFileContents {
    if (organizedAtoms.mols) {
        organizedAtoms.icon = "fa-regular fa-folder";
        organizedAtoms.class = "tree-group";
        organizedAtoms.nodes = organizedAtoms.mols;
        delete organizedAtoms.mols;

        organizedAtoms.nodes.forEach((molEntry: IMolEntry) => {
            if (molEntry.chains) {
                molEntry.icon = "fa-regular fa-folder";
                molEntry.class = "tree-group";
    
                molEntry.chains.forEach((chain: IChain) => {
                    if (chain.residues) {
                        chain.nodes = chain.residues;
                        chain.icon = "fa-regular fa-folder";
                        chain.class = "tree-group";
    
                        // Iterate through chain.nodes and add data to each node.
                        chain.nodes.forEach((residue: IResidue) => {
                            residue.icon = "fa-regular fa-file";
                            residue.class = "tree-item";
                        });
    
                        delete chain.residues;
                    } else {
                        // No residues, so it's terminal node.
                        chain.icon = "fa-regular fa-file";
                        chain.class = "tree-item";
                    }
                });
            } else {
                // No chains, so it's a terminal node.
                molEntry.icon = "fa-regular fa-file";
                molEntry.class = "tree-item";
            }
            molEntry.nodes = molEntry.chains;
            delete molEntry.chains;
        });
    }

    return organizedAtoms;
}

waitForDataFromMainThread().then((data) => {
    let organizedAtoms = divideAtomsIntoDistinctComponents(data);
    let treeViewData = makeTreeViewData(organizedAtoms);

    let pathsToIds: any[] = [];

    if (treeViewData.nodes) {
        for (let idx = 0; idx < treeViewData.nodes.length; idx++) {
            let node = treeViewData.nodes[idx];
            switch (node.type) {
                case MolType.PROTEIN:
                    pathsToIds.push(...addMolTypeAndStyle(node, proteinStyle, idx));
                    break;
                case MolType.NUCLEIC:
                    pathsToIds.push(...addMolTypeAndStyle(node, nucleicStyle, idx));
                    break;
                case MolType.LIGAND:
                    pathsToIds.push(...addMolTypeAndStyle(node, ligandsStyle, idx));
                    break;
                case MolType.METAL:
                    pathsToIds.push(...addMolTypeAndStyle(node, metalsStyle, idx));
                    break;
                case MolType.LIPID:
                    pathsToIds.push(...addMolTypeAndStyle(node, lipidStyle, idx));
                    break;
                case MolType.IONS:
                    pathsToIds.push(...addMolTypeAndStyle(node, ionsStyle, idx));
                    break;
                case MolType.SOLVENT:
                    pathsToIds.push(...addMolTypeAndStyle(node, solventStyle, idx));
                    break;
            }
        }
    }

    sendResponseToMainThread([treeViewData, pathsToIds]);
});
