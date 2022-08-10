/* eslint-disable @typescript-eslint/ban-ts-comment */

import {
    sendResponseToMainThread,
    waitForDataFromMainThread,
} from "@/Core/WebWorkers/WorkerHelper";

// @ts-ignore
import * as tmp from "@/UI/Panels/Viewer/3Dmol-nojquery.JDD";
import {
    ionSel,
    lipidSel,
    metalSel,
    nucleicSel,
    proteinSel,
    solventSel,
} from "./Lookups/ComponentSelections";
import {
    ionsStyle,
    ligandsStyle,
    lipidStyle,
    metalsStyle,
    nucleicStyle,
    proteinStyle,
    solventStyle,
} from "./Lookups/DefaultStyles";
import {
    IAtom,
    IMolContainer,
    IStyleAndSel,
    MolType,
} from "../../UI/Navigation/TreeView/TreeInterfaces";
import {
    getAllNodesFlattened,
    getTerminalNodes,
} from "@/UI/Navigation/TreeView/TreeUtils";
import { randomID } from "@/Core/Utils";
const $3Dmol = tmp as any;

let glviewer: any;

function organizeSelByChain(sel: any, mol: any, entryName: string): IMolContainer {
    const selectedAtoms = mol.selectedAtoms(sel);
    const molEntry: IMolContainer = {
        title: entryName,
        viewerDirty: true,
        treeExpanded: false,
        visible: true,
        focused: false,
        nodes: [],
    };
    let lastChainID = "";
    selectedAtoms.forEach((atom: IAtom) => {
        const nodes = molEntry.nodes as IMolContainer[];
        if (atom.chain !== lastChainID) {
            nodes.push({
                title: atom.chain,
                model: [],
                viewerDirty: true,
                treeExpanded: false,
                visible: true,
                focused: false,
            });
            lastChainID = atom.chain;
        }

        (nodes[nodes.length - 1].model as IAtom[]).push(atom);
    });
    mol.removeAtoms(selectedAtoms);

    return molEntry;
}

function flattenChains(molEntry: IMolContainer): IMolContainer {
    if (!molEntry.nodes) {
        throw new Error("No nodes found in molEntry.");
    }
    const flattened: IMolContainer = {
        title: molEntry.title,
        model: [],
        viewerDirty: true,
        treeExpanded: false,
        visible: true,
        focused: false,
    };
    molEntry.nodes.forEach((chain: IMolContainer) => {
        if (!chain.model) {
            throw new Error("No atoms found in chain.");
        }
        
        (flattened.model as IAtom[]).push(...(chain.model as IAtom[]));
    });
    return flattened;
}

function residueID(atom: IAtom): string {
    return atom.resn + ":" + atom.resi;
}

function divideChainsIntoResidues(molEntry: IMolContainer): IMolContainer {
    if (!molEntry.nodes) {
        return molEntry;
    }

    const dividedMolEntry: IMolContainer = {
        title: molEntry.title,
        nodes: [],
        viewerDirty: true,
        treeExpanded: false,
        visible: true,
        focused: false,
    };
    let lastChainID = "";
    molEntry.nodes.forEach((chain: IMolContainer) => {
        if (!chain.model) {
            return;
        } // Already divided apparently.

        if (chain.title !== lastChainID) {
            dividedMolEntry.nodes?.push({
                title: chain.title,
                nodes: [],
                treeExpanded: false,
                visible: true,
                viewerDirty: true,
                focused: false,
            });
            lastChainID = chain.title;
        }
        let lastResidueID = "";
        (chain.model as IAtom[]).forEach((atom: IAtom) => {
            const chains = dividedMolEntry.nodes;
            if (!chains) {
                throw new Error("No chains found in dividedMolEntry.");
            }
            const residues = chains[chains.length - 1].nodes;
            if (!residues) {
                // Always exists. This here only to satisfy typechecker.
                throw new Error("No residues found in dividedMolEntry.");
            }

            const newKey = residueID(atom);
            if (newKey !== lastResidueID) {
                residues.push({
                    title: newKey,
                    model: [],
                    viewerDirty: true,
                    treeExpanded: false,
                    visible: true,
                    focused: false,
                });
                lastResidueID = newKey;
            }
            const lastResidueIdx = residues.length - 1;
            const atoms = residues[lastResidueIdx].model as IAtom[];
            if (atoms) {
                atoms.push(atom);
            }
        });
    });
    return dividedMolEntry;
}

// If any key is associated with a list of length 1, collapse it so the key is
// merged with the key one up.
function collapseSingles(molEntry: IMolContainer): IMolContainer {
    if (molEntry.nodes) {
        let anyNodeMerged = true;
        while (anyNodeMerged) {
            anyNodeMerged = false;

            const allNodes = getAllNodesFlattened([molEntry]);
            allNodes.forEach((anyNode: IMolContainer) => {
                const anyNodeNodes = anyNode.nodes as IMolContainer[];
                if (anyNode.nodes && (anyNodeNodes.length === 1)) {
                    // Only 1 child node
                    const childNode = anyNodeNodes[0];
                    anyNode.title = `${anyNode.title}:${childNode.title}`;
                    anyNode.model = childNode.model;
                    anyNode.type = childNode.type;
    
                    if (childNode.nodes) {
                        anyNode.nodes = childNode.nodes;
                    } else {
                        delete anyNode.nodes;
                    }

                    anyNodeMerged = true;
                }
            });
        }
        
    }
    
    // Now for some purly cosmetic changes to the top-level menu items.
    if (molEntry.title.startsWith("Compound:")) {
        molEntry.title = molEntry.title.substring(9);
        // Does it start with /[A-Z]:/?
        if (molEntry.title.match(/^[A-Z]:/)) {
            // Put chain at end.
            molEntry.title = molEntry.title.replace(/^([A-Z]):(.*?)$/g, "$2:$1");
        }
    } else {
        molEntry.title = molEntry.title.split(":")[0];
    }
    
    return molEntry;
}

function makeTitleDOM(title: string): string {
    // return `<div class='tree-title'>${title}</div><div class='tree-btn'>moo</div>`;
    // TODO: Refactor this away
    return title;
}

function addMolTypeAndStyle(
    molContainer: IMolContainer,
    stylesAndSels: IStyleAndSel[]
): void {
    const molType = molContainer.type;
    for (const mol of getTerminalNodes([molContainer])) {
        mol.type = molType;
        mol.stylesSels = stylesAndSels;
    }
    for (const mol of getAllNodesFlattened([molContainer])) {
        mol.id = randomID();
        mol.title = makeTitleDOM(mol.title);
        mol.treeExpanded = false;
        mol.visible = true;
        mol.viewerDirty = true;
    }
}

function divideAtomsIntoDistinctComponents(data: {
    [key: string]: any;
}): IMolContainer {
    // This that are bonded to each other are considered to be in the same
    // component.

    // glviewer for use in webworker.
    if (!glviewer) {
        glviewer = $3Dmol.createViewer("", {});
    }
    const mol = glviewer.makeGLModel_JDD(data.molText, data.format);

    let proteinAtomsByChain = organizeSelByChain(proteinSel, mol, "Protein");
    let nucleicAtomsByChain = organizeSelByChain(nucleicSel, mol, "Nucleic");
    const solventAtomsByChain = organizeSelByChain(solventSel, mol, "Solvent");
    let metalAtomsByChain = organizeSelByChain(metalSel, mol, "Metal");
    const ionAtomsByChain = organizeSelByChain(ionSel, mol, "Ion");
    let lipidAtomsByChain = organizeSelByChain(lipidSel, mol, "Lipid");
    let compoundsByChain = organizeSelByChain({}, mol, "Compound"); // Everything else is ligands

    // Further divide by residue (since likely each ligand is on its own
    // residue, not bound to any other).
    compoundsByChain = divideChainsIntoResidues(compoundsByChain);

    // Solvent and ions don't need to be divided by chain.
    const solventAtomsNoChain: IMolContainer = flattenChains(solventAtomsByChain);
    const ionAtomsNoChain: IMolContainer = flattenChains(ionAtomsByChain);

    // For everything else, if given chain has only one item, collapse it.
    compoundsByChain = collapseSingles(compoundsByChain);
    proteinAtomsByChain = collapseSingles(proteinAtomsByChain);
    nucleicAtomsByChain = collapseSingles(nucleicAtomsByChain);
    metalAtomsByChain = collapseSingles(metalAtomsByChain);
    lipidAtomsByChain = collapseSingles(lipidAtomsByChain);

    proteinAtomsByChain.type = MolType.PROTEIN;
    nucleicAtomsByChain.type = MolType.NUCLEIC;
    compoundsByChain.type = MolType.COMPOUND;
    metalAtomsByChain.type = MolType.METAL;
    lipidAtomsByChain.type = MolType.LIPID;
    ionAtomsNoChain.type = MolType.IONS;
    solventAtomsNoChain.type = MolType.SOLVENT;

    // // add in default styles
    // proteinAtomsByChain.style = proteinStyle;
    // nucleicAtomsByChain.style = nucleicStyle;

    // Page into single object
    let fileContents: IMolContainer = {
        title: makeTitleDOM(data.molName),
        treeExpanded: false,
        viewerDirty: true,
        visible: true,
        focused: false,
        nodes: [
            proteinAtomsByChain,
            nucleicAtomsByChain,
            compoundsByChain,
            metalAtomsByChain,
            lipidAtomsByChain,
            ionAtomsNoChain,
            solventAtomsNoChain,
        ],
    };

    fileContents = cleanUpFileContents(fileContents);

    return fileContents;
}

function cleanUpFileContents(fileContents: IMolContainer): IMolContainer {
    if (fileContents.nodes) {
        // Iterate through organizedAtoms. If object and has no keys, remove it.
        // If list and has length 0, remove it.
        fileContents.nodes = fileContents.nodes.filter((m: IMolContainer) => {
            let totalSubItems = 0;
            totalSubItems += m.nodes ? m.nodes.length : 0;
            totalSubItems += m.model ? (m.model as IAtom[]).length : 0;
            return totalSubItems > 0;
        });

        // Clean up a few additional things. If it's text has "undefined:",
        // replace that with "". If it has more than one node, add plural to
        // text in some cases.
        for (const m of fileContents.nodes) {
            if (
                m.nodes &&
                m.nodes.length > 0 &&
                ["Metal", "Ion", "Lipid", "Compound"].indexOf(m.title) > -1
            ) {
                m.title += "s";
            }

            // Replace "undefined:" in m.text with ""
            if (m.title) {
                m.title = m.title.replace(/undefined:/g, "");
            }
            m.title = m.title.replace(/undefined /g, "");
        }
    }

    fileContents = collapseSingles(fileContents);

    return fileContents;
}

waitForDataFromMainThread().then((data) => {
    const organizedAtoms = divideAtomsIntoDistinctComponents(data);

    organizedAtoms.id = randomID();

    const nodesToConsider: IMolContainer[] = [organizedAtoms];
    if (organizedAtoms.nodes) {
        nodesToConsider.push(...organizedAtoms.nodes);
    }

    for (const node of nodesToConsider) {
        switch (node.type) {
            case MolType.PROTEIN:
                addMolTypeAndStyle(node, proteinStyle);
                break;
            case MolType.NUCLEIC:
                addMolTypeAndStyle(node, nucleicStyle);
                break;
            case MolType.COMPOUND:
                addMolTypeAndStyle(node, ligandsStyle);
                break;
            case MolType.METAL:
                addMolTypeAndStyle(node, metalsStyle);
                break;
            case MolType.LIPID:
                addMolTypeAndStyle(node, lipidStyle);
                break;
            case MolType.IONS:
                addMolTypeAndStyle(node, ionsStyle);
                break;
            case MolType.SOLVENT:
                addMolTypeAndStyle(node, solventStyle);
                break;
        }
    }

    sendResponseToMainThread(organizedAtoms);
});
