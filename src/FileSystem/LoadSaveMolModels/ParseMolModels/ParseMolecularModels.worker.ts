import {
    IMolData,
    sendResponseToMainThread,
    waitForDataFromMainThread,
} from "@/Core/WebWorkers/WorkerHelper";

import {
    GLModel,
    IAtom,
    IMolContainer,
    IStyle,
    MolType,
    SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    getAllNodesFlattened,
    getTerminalNodes,
} from "@/UI/Navigation/TreeView/TreeUtils";
import { randomID } from "@/Core/Utils";
import { dynamicImports } from "@/Core/DynamicImports";
import {
    ionSel,
    lipidSel,
    metalSel,
    nucleicSel,
    proteinSel,
    solventSel,
} from "../Types/ComponentSelections";
import {
    proteinStyle,
    nucleicStyle,
    ligandsStyle,
    metalsStyle,
    lipidStyle,
    ionsStyle,
    solventStyle,
} from "../Types/DefaultStyles";
import { IFormatInfo, getFormatInfoGivenExt } from "../Types/MolFormats";

let glviewer: any;

enum NodesOrModel {
    Nodes,
    Model,
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
    nodesOrModel = NodesOrModel.Nodes
): IMolContainer {
    let obj = {
        title: molName,
        viewerDirty: true,
        treeExpanded: false,
        visible: true,
        focused: false,
        selected: SelectedType.False,
    };

    obj = {
        ...obj,
        ...(nodesOrModel === NodesOrModel.Model
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
                selected: SelectedType.False,
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
        NodesOrModel.Model
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
                    _getDefaultMolContainer(newKey, NodesOrModel.Model)
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
 * @param  {IStyle[]} stylesAndSels The styles and selections to add.
 */
function addMolTypeAndStyle(
    molContainer: IMolContainer,
    stylesAndSels: IStyle[]
) {
    const molType = molContainer.type;
    for (const mol of getTerminalNodes([molContainer])) {
        mol.type = molType;
        mol.styles = stylesAndSels;
    }
    for (const mol of getAllNodesFlattened([molContainer])) {
        mol.id = randomID();
        mol.treeExpanded = false;
        mol.visible = true;
        mol.viewerDirty = true;
    }
}

/**
 * Given molecular data, returns information about the format.
 *
 * @param  {IMolData} data  The molecular data.
 * @returns {IFormatInfo}  Information about the format.
 */
function getFormatInfo(data: IMolData): IFormatInfo {
    const molFormat = data.format;
    return getFormatInfoGivenExt(molFormat) as IFormatInfo;
}

/**
 * Given molecular text, divides the text by frames.
 *
 * @param  {string} molText  The molecular text.
 * @param  {IFormatInfo} molFormatInfo  Information about the format.
 * @returns {string[]}  The frames.
 */
function divideMolTxtIntoFrames(
    molText: string,
    molFormatInfo: IFormatInfo
): string[] {
    let frames: string[] = [molText];

    if (molFormatInfo && molFormatInfo.frameSeparators) {
        for (const frameSeparator of molFormatInfo.frameSeparators) {
            // const txt = frameSeparator.text.replace(/\$/g, "\\$");
            if (frameSeparator.isAtEndOfFrame) {
                // Add string "<<DIVIDE>>" after every occurance of
                // molInfo.frameSeparators.text
                // const srch = new RegExp(txt + "$", "gm");
                // const rpl = frameSeparator.text + "<<DIVIDE>>";
                molText = molText.replaceAll(
                    frameSeparator.text,
                    // Strange exception required for SDF files
                    (frameSeparator.text !== "\n$$$$\n"
                        ? frameSeparator.text
                        : "\n$$$$$$$$\n") + "<<DIVIDE>>"
                );

                // Every time "\n$$$$\n" appears in string, replace with "MOOSE\n$$$$\n". Don't use regex / RegExp
            } else {
                // Add string "<<DIVIDE>>" before every occurance of
                // molInfo.frameSeparators.text
                molText = molText.replaceAll(
                    frameSeparator.text,
                    "<<DIVIDE>>" + frameSeparator.text
                );
            }
        }

        frames = molText.split("<<DIVIDE>>");
        frames = frames.map((f) => f.trim()).filter((f) => f.length > 0);
    }

    return frames;
}

/**
 * Given molecular text, tries to detect the name from the text itself.
 *
 * @param  {string} molText  The molecular text.
 * @param  {IFormatInfo} molFormatInfo  Information about the format.
 * @returns {string}  The name. Returns "" if no name found.
 */
function getNameFromContent(
    molText: string,
    molFormatInfo: IFormatInfo
): string {
    const regexps = molFormatInfo.namesRegex;
    let firstMatch = "";
    if (regexps) {
        for (const regexp of regexps) {
            // Must reset regex for repeated use. Interesting. See
            // https://stackoverflow.com/questions/4724701/regexp-exec-returns-null-sporadically
            regexp.lastIndex = 0;

            const match = regexp.exec(molText);
            if (match) {
                firstMatch = match[1];
                break;

                // below prevents multiple matches
                // molText = molText.replaceAll(match[1], "");
            }
        }
    }

    // Remove terminal ; from match
    if (firstMatch.endsWith(";")) {
        firstMatch = firstMatch.substring(0, firstMatch.length - 1);
    }

    // Keep only unique
    // allMatches = allMatches.filter((v, i, a) => a.indexOf(v) === i);

    // Keep only at most first 10 letters. Append ... if more than 10
    // letters.
    if (firstMatch.length > 20) {
        firstMatch = firstMatch.substring(0, 20) + "...";
    }

    // Compile into single string. Separate by ;
    return firstMatch.replaceAll(":", "");
}

/**
 * Given molecular data from the main thread, convert it into a IMolContainer
 * object divided by component (protien, compound, solvent, etc.).
 *
 * @param  {IMolData} data The molecular data.
 * @returns {Promise<IMolContainer>} The divided molecule.
 */
function divideAtomsIntoDistinctComponents(
    data: IMolData
): Promise<IMolContainer[]> {
    // Any molecules that share bonds are the same component.

    // Get the format
    const molFormatInfo = getFormatInfo(data);
    const frames = divideMolTxtIntoFrames(data.molText, molFormatInfo);

    // glviewer for use in webworker.
    return dynamicImports.mol3d.module.then(($3Dmol: any) => {
        if (!glviewer) {
            glviewer = $3Dmol.createViewer("", {});
        }

        const fileContentsAllFrames: IMolContainer[] = [];

        for (let frameIdx = 0; frameIdx < frames.length; frameIdx++) {
            const frame = frames[frameIdx];
            const mol = glviewer.makeGLModel_JDD(frame, data.format);

            // Check if 3dmol GLModel has multiple frames

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
            const ionAtomsNoChain: IMolContainer =
                flattenChains(ionAtomsByChain);

            // For everything else, if given chain has one item, collapse it.
            compoundsByChain = collapseSingles(compoundsByChain, true);
            proteinAtomsByChain = collapseSingles(proteinAtomsByChain);
            nucleicAtomsByChain = collapseSingles(nucleicAtomsByChain);
            metalAtomsByChain = collapseSingles(metalAtomsByChain);
            lipidAtomsByChain = collapseSingles(lipidAtomsByChain);

            proteinAtomsByChain.type = MolType.Protein;
            nucleicAtomsByChain.type = MolType.Nucleic;
            compoundsByChain.type = MolType.Compound;
            metalAtomsByChain.type = MolType.Metal;
            lipidAtomsByChain.type = MolType.Lipid;
            ionAtomsNoChain.type = MolType.Ions;
            solventAtomsNoChain.type = MolType.Solvent;

            // // add in default styles
            // proteinAtomsByChain.style = proteinStyle;
            // nucleicAtomsByChain.style = nucleicStyle;

            let molName =
                data.molName +
                (frames.length > 1 ? ", " + (frameIdx + 1).toString() : "");
            const molNameFromContent = getNameFromContent(frame, molFormatInfo);

            if (molNameFromContent !== "") {
                molName = `${molNameFromContent} (${molName})`;
            }

            // Page into single object
            let fileContents: IMolContainer = {
                title: molName,
                viewerDirty: true,
                treeExpanded: false,
                visible: true,
                focused: false,
                selected: SelectedType.False,
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

            fileContentsAllFrames.push(fileContents);
        }

        return fileContentsAllFrames;
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
    .then((data: IMolData) => divideAtomsIntoDistinctComponents(data))
    .then((organizedAtomsFrames: IMolContainer[]) => {
        let organizedAtomsFramesFixed: IMolContainer[] = [];
        for (const organizedAtoms of organizedAtomsFrames) {
            organizedAtoms.id = randomID();

            const nodesToConsider: IMolContainer[] = [organizedAtoms];
            if (organizedAtoms.nodes) {
                nodesToConsider.push(...organizedAtoms.nodes);
            }

            for (const node of nodesToConsider) {
                switch (node.type) {
                    case MolType.Protein:
                        addMolTypeAndStyle(node, proteinStyle);
                        break;
                    case MolType.Nucleic:
                        addMolTypeAndStyle(node, nucleicStyle);
                        break;
                    case MolType.Compound:
                        addMolTypeAndStyle(node, ligandsStyle);
                        break;
                    case MolType.Metal:
                        addMolTypeAndStyle(node, metalsStyle);
                        break;
                    case MolType.Lipid:
                        addMolTypeAndStyle(node, lipidStyle);
                        break;
                    case MolType.Ions:
                        addMolTypeAndStyle(node, ionsStyle);
                        break;
                    case MolType.Solvent:
                        addMolTypeAndStyle(node, solventStyle);
                        break;
                }
            }

            addParentIds(organizedAtoms);

            organizedAtomsFramesFixed.push(organizedAtoms);
        }

        organizedAtomsFramesFixed = organizedAtomsFramesFixed.filter(
            (o) =>
                (o.nodes && o.nodes.length > 0) ||
                (o.model && (o.model as IAtom[]).length > 0)
        );

        sendResponseToMainThread(organizedAtomsFramesFixed);

        return;
    })
    .catch((err: any) => {
        console.error(err);
    });
