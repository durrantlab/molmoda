import {
    sendResponseToMainThread,
    waitForDataFromMainThread,
} from "@/Core/WebWorkers/WorkerHelper";

import {
    ionSel,
    lipidSel,
    metalSel,
    nucleicSel,
    proteinSel,
    solventSel,
} from "../Definitions/ComponentSelections";
import {
    ionsStyle,
    ligandsStyle,
    lipidStyle,
    metalsStyle,
    nucleicStyle,
    proteinStyle,
    solventStyle,
} from "../Definitions/DefaultStyles";
import {
    GLModel,
    IAtom,
    IMolContainer,
    IStyleAndSel,
    MolType,
    SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    getAllNodesFlattened,
    getTerminalNodes,
} from "@/UI/Navigation/TreeView/TreeUtils";
import { randomID } from "@/Core/Utils";
import { dynamicImports } from "@/Core/DynamicImports";

let glviewer: any;

enum NodesOrModel {
    NODES,
    MODEL,
}

/**
 * Helper function to generate default mol container (used throughout).
 *
 * @param  {string}       molName                            The name of the
 *                                                           container.
 * @param  {NodesOrModel} [nodesOrModel=NodesOrModel.NODES]  Whether to generate
 *                                                           nodes or model.
 * @returns {IMolContainer}  The default mol container.
 */
function _getDefaultMolContainer(
    molName: string,
    nodesOrModel = NodesOrModel.NODES
): IMolContainer {
    let obj = {
        title: molName,
        viewerDirty: true,
        treeExpanded: false,
        visible: true,
        focused: false,
        selected: SelectedType.FALSE,
    };

    obj = {
        ...obj,
        ...(nodesOrModel === NodesOrModel.MODEL
            ? { model: [] }
            : { nodes: [] }),
    };

    return obj as IMolContainer;
}

/**
 * Divides a molecule into chains.
 *
 * @param  {any}     sel     The selection to divide (e.g., a selection that
 *                           gets all protein atoms).
 * @param  {GLModel} mol     The molecule with the atoms. Note that the atoms
 *                           specified by sel end up getting removed, because
 *                           the function moves them into their own molecules.
 * @param  {string}  molName The name of the entry.
 * @returns {IMolContainer} The molecule with the chains.
 */
function organizeSelByChain(
    sel: any,
    mol: GLModel,
    molName: string
): IMolContainer {
    let selectedAtoms = mol.selectedAtoms(sel);

    // If chain is " " for any atom, set it to "X"
    selectedAtoms = selectedAtoms.map((atom: IAtom) => {
        if (atom.chain === " ") {
            atom.chain = "X";
        }
        return atom;
    });

    const molContainer: IMolContainer = _getDefaultMolContainer(molName);
    let lastChainID = "";
    selectedAtoms.forEach((atom: IAtom) => {
        const nodes = molContainer.nodes as IMolContainer[];
        if (atom.chain !== lastChainID) {
            nodes.push({
                title: atom.chain,
                model: [],
                viewerDirty: true,
                treeExpanded: false,
                visible: true,
                selected: SelectedType.FALSE,
                focused: false,
            });
            lastChainID = atom.chain;
        }

        (nodes[nodes.length - 1].model as IAtom[]).push(atom);
    });
    mol.removeAtoms(selectedAtoms);

    return molContainer;
}

/**
 * Some molecular components don't need chains (e.g., solvents and ions). This
 * function flattens chains.
 *
 * @param  {IMolContainer} molContainer The molecule (with chains) to flatten.
 * @returns {IMolContainer} The flattened molecule.
 */
function flattenChains(molContainer: IMolContainer): IMolContainer {
    if (!molContainer.nodes) {
        throw new Error("No nodes found in molContainer.");
    }
    const flattened: IMolContainer = _getDefaultMolContainer(
        molContainer.title,
        NodesOrModel.MODEL
    );

    molContainer.nodes.forEach((chain: IMolContainer) => {
        if (!chain.model) {
            throw new Error("No atoms found in chain.");
        }

        (flattened.model as IAtom[]).push(...(chain.model as IAtom[]));
    });
    return flattened;
}

/**
 * Gets an id of a given atom (string representation).
 *
 * @param  {IAtom} atom The atom to get the id of.
 * @returns {string} The id of the atom.
 */
function residueID(atom: IAtom): string {
    return atom.resn + ":" + atom.resi;
}

/**
 * In some cases, it's useful to further divide chains into residues (e.g.,
 * small-molecule compounds).
 *
 * @param  {IMolContainer} molContainer The molecule to divide.
 * @returns {IMolContainer} The divided molecule.
 */
function divideChainsIntoResidues(molContainer: IMolContainer): IMolContainer {
    if (!molContainer.nodes) {
        return molContainer;
    }

    const dividedMolEntry: IMolContainer = _getDefaultMolContainer(
        molContainer.title
    );

    let lastChainID = "";
    molContainer.nodes.forEach((chain: IMolContainer) => {
        if (!chain.model) {
            // Already divided apparently.
            return;
        }

        if (chain.title !== lastChainID) {
            dividedMolEntry.nodes?.push(_getDefaultMolContainer(chain.title));
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
                // Always exists. This here for typechecker.
                throw new Error("No residues found in dividedMolEntry.");
            }

            const newKey = residueID(atom);
            if (newKey !== lastResidueID) {
                residues.push(
                    _getDefaultMolContainer(newKey, NodesOrModel.MODEL)
                );
                lastResidueID = newKey;
            }
            const atoms = residues[residues.length - 1].model as IAtom[];
            if (atoms) {
                atoms.push(atom);
            }
        });
    });
    return dividedMolEntry;
}

/**
 * If any molecule has a list of 1 submolecules, collapse it so one molecule,
 * merging the titles.
 *
 * @param  {IMolContainer} molContainer            The molecule to collapse.
 * @param  {boolean}       [childTitleFirst=false] When creating the merged
 *                                                 title, but the name of the
 *                                                 child molecule first.
 * @returns {IMolContainer} The collapsed molecule.
 */
function collapseSingles(
    molContainer: IMolContainer,
    childTitleFirst = false
): IMolContainer {
    if (molContainer.nodes) {
        let anyNodeMerged = true;
        while (anyNodeMerged) {
            anyNodeMerged = false;

            const allNodes = getAllNodesFlattened([molContainer]);
            allNodes.forEach((anyNode: IMolContainer) => {
                const anyNodeNodes = anyNode.nodes as IMolContainer[];
                if (anyNode.nodes && anyNodeNodes.length === 1) {
                    // 1 child node
                    const childNode = anyNodeNodes[0];
                    anyNode.title = childTitleFirst
                        ? `${childNode.title}:${anyNode.title}`
                        : `${anyNode.title}:${childNode.title}`;
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

    // Now for some purly cosmetic changes to the top-level menu items. (test
    // 1HU4, 1XDN, and 2HU4).

    if (molContainer.title.endsWith(":Compound")) {
        if (!molContainer.nodes || molContainer.nodes.length === 0) {
            // It has no children. Remove the "Compound" suffix.
            molContainer.title = molContainer.title.substring(
                0,
                molContainer.title.length - 9
            );
        } else {
            // It has children. Probably looks like "X:Compound"
            molContainer.title = molContainer.title.split(":")[1];
        }
    } else {
        // Looks like "Protein:A". Remove chain.
        molContainer.title = molContainer.title.split(":")[0];
    }

    return molContainer;
}
/**
 * Adds the molecule type, style, and selections.
 *
 * @param  {IMolContainer}  molContainer  The molecule to add the type and style
 *                                        to.
 * @param  {IStyleAndSel[]} stylesAndSels The styles and selections to add.
 */
function addMolTypeAndStyle(
    molContainer: IMolContainer,
    stylesAndSels: IStyleAndSel[]
) {
    const molType = molContainer.type;
    for (const mol of getTerminalNodes([molContainer])) {
        mol.type = molType;
        mol.stylesSels = stylesAndSels;
    }
    for (const mol of getAllNodesFlattened([molContainer])) {
        mol.id = randomID();
        mol.treeExpanded = false;
        mol.visible = true;
        mol.viewerDirty = true;
    }
}

/**
 * Given molecular data from the main thread, convert it into a IMolContainer
 * object divided by component (protien, compound, solvent, etc.).
 *
 * @param  {any} data The molecular data.
 * @returns {Promise<IMolContainer>} The divided molecule.
 */
function divideAtomsIntoDistinctComponents(data: {
    [key: string]: any;
}): Promise<IMolContainer> {
    // Any molecules that share bonds are the same component.

    // glviewer for use in webworker.
    return dynamicImports.mol3d.module.then(($3Dmol: any) => {
        if (!glviewer) {
            glviewer = $3Dmol.createViewer("", {});
        }
        const mol = glviewer.makeGLModel_JDD(data.molText, data.format);

        let proteinAtomsByChain = organizeSelByChain(
            proteinSel,
            mol,
            "Protein"
        );
        let nucleicAtomsByChain = organizeSelByChain(
            nucleicSel,
            mol,
            "Nucleic"
        );
        const solventAtomsByChain = organizeSelByChain(
            solventSel,
            mol,
            "Solvent"
        );
        let metalAtomsByChain = organizeSelByChain(metalSel, mol, "Metal");
        const ionAtomsByChain = organizeSelByChain(ionSel, mol, "Ion");
        let lipidAtomsByChain = organizeSelByChain(lipidSel, mol, "Lipid");
        let compoundsByChain = organizeSelByChain({}, mol, "Compound"); // Everything else is ligands

        // Further divide by residue (since each ligand is on its own residue,
        // not bound to any other).
        compoundsByChain = divideChainsIntoResidues(compoundsByChain);

        // You don't need to divide solvent and ions by chain.
        const solventAtomsNoChain: IMolContainer =
            flattenChains(solventAtomsByChain);
        const ionAtomsNoChain: IMolContainer = flattenChains(ionAtomsByChain);

        // For everything else, if given chain has one item, collapse it.
        compoundsByChain = collapseSingles(compoundsByChain, true);
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
            title: data.molName,
            viewerDirty: true,
            treeExpanded: false,
            visible: true,
            focused: false,
            selected: SelectedType.FALSE,
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
    });
}

/**
 * Clean up the molContainer in preparation for sending it back to the main
 * worker.
 *
 * @param  {IMolContainer} molContainer The molContainer to clean up.
 * @returns {IMolContainer} The cleaned up molContainer.
 */
function cleanUpFileContents(molContainer: IMolContainer): IMolContainer {
    if (molContainer.nodes) {
        // Iterate through organizedAtoms. If object and has no keys, remove it.
        // If list and has length 0, remove it.
        molContainer.nodes = molContainer.nodes.filter((m: IMolContainer) => {
            let totalSubItems = 0;
            totalSubItems += m.nodes ? m.nodes.length : 0;
            totalSubItems += m.model ? (m.model as IAtom[]).length : 0;
            return totalSubItems > 0;
        });

        // Clean up issues. If it's text has "undefined:", replace that with "".
        // If it has more than one node, add plural to text in some cases.
        for (const m of molContainer.nodes) {
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

    molContainer = collapseSingles(molContainer);

    return molContainer;
}

/**
 * Adds the parent ids to the nodes.
 *
 * @param  {IMolContainer} molContainer The molContainer to add the ids to.
 */
function addParentIds(molContainer: IMolContainer) {
    const allNodes = getAllNodesFlattened([molContainer]);
    allNodes.forEach((anyNode: IMolContainer) => {
        if (anyNode.nodes && anyNode.nodes.length > 0) {
            anyNode.nodes.forEach((node: IMolContainer) => {
                node.parentId = anyNode.id;
            });
        }
    });
}

waitForDataFromMainThread()
    .then((data) => divideAtomsIntoDistinctComponents(data))
    .then((organizedAtoms: IMolContainer) => {
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

        addParentIds(organizedAtoms);

        sendResponseToMainThread(organizedAtoms);

        return;
    })
    .catch((err: any) => {
        console.error(err);
    });
