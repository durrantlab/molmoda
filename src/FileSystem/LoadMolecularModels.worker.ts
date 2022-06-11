/* eslint-disable */

import {
    sendResponseToMainThread,
    waitForDataFromMainThread,
} from "@/Core/WebWorkers/WorkerHelper";

// @ts-ignore
import * as tmp from "../UI/Viewer/3Dmol-nojquery.JDD";
import { ionSel, lipidSel, metalSel, nucleicSel, proteinSel, solventSel } from "./ComponentSelections";
const $3Dmol = (tmp as any);

let glviewer: any;

interface IAtom {
    chain: string;
    resi: number;
    resn: string;
}

interface IResidue {
    id: string;
    atoms: IAtom[]
}

interface IChain {
    id: string;
    atoms?: IAtom[];
    residues?: IResidue[];
}

interface IMolEntry {
    id: string;
    chains?: IChain[];
    atoms?: IAtom[];
}


function organizeSelByChain(sel: any, mol: any, entryName: string): IMolEntry {
    const selectedAtoms = mol.selectedAtoms(sel);
    const molEntry: IMolEntry = {
        id: entryName,
        chains: [],
    }
    let lastChainID: string = "";
    selectedAtoms.forEach((atom: IAtom) => {
        if (atom.chain !== lastChainID) {
            // @ts-ignore
            molEntry.chains.push({
                id: atom.chain,
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
        id: molEntry.id,
        atoms: []
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

function divideChainsIntoResidues(molEntry: IMolEntry): IMolEntry {
    if (!molEntry.chains) { return molEntry; }

    const dividedMolEntry: IMolEntry = {
        id: molEntry.id,
        chains: [],
    }
    let lastChainID: string = "";
    molEntry.chains.forEach((chain: IChain) => {
        if (!chain.atoms) { return; }  // Already divided apparently.

        if (chain.id !== lastChainID) {
            // @ts-ignore
            dividedMolEntry.chains.push({
                id: chain.id,
                residues: [],
            });
            lastChainID = chain.id;
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

            let newKey = atom.resi + ":" + atom.resn;
            if (newKey !== lastResidueID) {
                residues.push({
                    id: newKey,
                    atoms: [],
                });
                lastResidueID = newKey;
            }
            let lastResidueIdx = residues.length - 1;
            residues[lastResidueIdx].atoms.push(atom);
        });
    });
    return dividedMolEntry;
}

// If any key is associated with a list of length 1, collapse it so the key is merged with the key one up.
function collapseSingleResidueChains(organized: {[key:string]: any}): {[key:string]: any} {
    const collapsed: {[key:string]: any} = {};
    // Iterate through key/value pairs
    Object.keys(organized).forEach((key1: string) => {
        const val = organized[key1];
        if (Object.keys(val).length === 1) {
            const key2 = Object.keys(val)[0];
            const val2 = val[key2];
            collapsed[key1 + ":" + key2] = val2;
        } else {
            collapsed[key1] = val;
        }
    });
    return collapsed;
}

function divideAtomsIntoDistinctComponents(data: {[key:string]: any}): {[key:string]: any} {
    // This that are bonded to each other are considered to be in the same
    // component.

    if (!glviewer) {
        // glviewer for use in webworker.
        glviewer = $3Dmol.createViewer("", {});
    }
    let mol = glviewer.makeGLModel_JDD(data.molText, data.format);

    let proteinAtomsByChain: IMolEntry = organizeSelByChain(proteinSel, mol, "Protein");
    let nucleicAtomsByChain: IMolEntry = organizeSelByChain(nucleicSel, mol, "Nucleic");
    let solventAtomsByChain: IMolEntry = organizeSelByChain(solventSel, mol, "Solvent");
    let metalAtomsByChain: IMolEntry = organizeSelByChain(metalSel, mol, "Metals");
    let ionAtomsByChain: IMolEntry = organizeSelByChain(ionSel, mol, "Ions");
    let lipidAtomsByChain: IMolEntry = organizeSelByChain(lipidSel, mol, "Lipids");
    let ligandsByChain: IMolEntry = organizeSelByChain({}, mol, "Ligands");  // Everything else is ligands

    // Further divide by residue (since likely each ligand is on its own
    // residue, not bound to any other).
    ligandsByChain = divideChainsIntoResidues(ligandsByChain);

    // Solvent and ions don't need to be divided by chain.
    let solventAtomsNoChain: IMolEntry = flattenChains(solventAtomsByChain);
    let ionAtomsNoChain: IMolEntry = flattenChains(ionAtomsByChain);
    
    // For everything else, if given chain has only one item, collapse it.
    debugger

    // ligandsByChain = collapseSingleResidueChains(ligandsByChain);
    // proteinAtomsByChain = collapseSingleResidueChains(proteinAtomsByChain);
    // nucleicAtomsByChain = collapseSingleResidueChains(nucleicAtomsByChain);
    // metalAtomsByChain = collapseSingleResidueChains(metalAtomsByChain);
    // lipidAtomsByChain = collapseSingleResidueChains(lipidAtomsByChain);
    // TODO: Fix here.

    // Page into single object
    let organizedAtoms = {
        protein: proteinAtomsByChain,
        nucleic: nucleicAtomsByChain,
        ligand: ligandsByChain,
        metal: metalAtomsByChain,
        lipid: lipidAtomsByChain,
        ionAtomsByChain: ionAtomsNoChain,
        solvent: solventAtomsNoChain,
    }

    console.log("1", organizedAtoms);
    // debugger;

    // Iterate through organizedAtoms. If object and has no keys, remove it. If
    // list and has length 0, remove it.
    Object.keys(organizedAtoms).forEach((key: string) => {
        const val = (organizedAtoms as any)[key];
        if (typeof val === "object") {
            if (Object.keys(val).length === 0) {
                delete (organizedAtoms as any)[key];
            }
        } else if (Array.isArray(val) && val.length === 0) {
            delete (organizedAtoms as any)[key];
        }
    });

    console.log("2", organizedAtoms);
    // debugger;

    return organizedAtoms;
}

function makeTreeViewData(organizedAtoms: {[key:string]: any}): any[] {
    let treeViewData: any[] = [];
    // Iterate through keys
    Object.keys(organizedAtoms).forEach((key: string) => {
        const val = organizedAtoms[key];
        // If value is object
        if (val.length === undefined) {
            treeViewData.push({
                text: key,
                icon: "fa-regular fa-folder",
                class: "tree-item",
                nodes: makeTreeViewData(val),
            });
        } else {
            // terminal item (a model).
            let residues = val.map((v: any) => {
                return {
                    text: v.resn + ":" + v.resi,
                    icon: "fa-regular fa-file",
                    class: "tree-item"
                }
            });

            // Remove duplicate residue labels.
            residues = residues.filter((v: any, i: number) => {
                return v.text !== residues[i + 1]?.text;
            });

            treeViewData.push({
                text: key,
                icon: "fa-regular fa-file",
                class: "tree-item",
                nodes: residues
            });
        }
    });
    return treeViewData;
}

waitForDataFromMainThread().then((data) => {
    let organizedAtoms = divideAtomsIntoDistinctComponents(data);
    let treeViewData = makeTreeViewData(organizedAtoms);

    // console.log(mol);
    // glviewer.addRawModel_JDD(mol);
    // let atoms = mol.selectedAtoms({});

    // debugger;

    sendResponseToMainThread([organizedAtoms, treeViewData]);
});
