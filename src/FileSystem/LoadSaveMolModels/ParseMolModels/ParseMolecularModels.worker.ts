import {
    IMolData,
    sendResponseToMainThread,
    waitForDataFromMainThread,
} from "@/Core/WebWorkers/WorkerHelper";

import {
    IAtom,
    TreeNodeType,
    SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { randomID } from "@/Core/Utils/MiscUtils";
import {
    defaultProteinStyle,
    defaultNucleicStyle,
    defaultLigandsStyle,
    defaultMetalsStyle,
    defaultLipidStyle,
    defaultIonsStyle,
    defaultSolventStyle,
} from "@/Core/Styling/SelAndStyleDefinitions";
import {
    ionSel,
    lipidSel,
    metalSel,
    nucleicSel,
    proteinSel,
    solventSel,
    standardProteinResidues,
} from "../Types/ComponentSelections";
import { IFormatInfo, getFormatInfoGivenType } from "../Types/MolFormats";
import { getFileNameParts } from "@/FileSystem/FilenameManipulation";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { IFileInfo } from "@/FileSystem/Types";
import { makeEasyParser } from "./EasyParser";
import { EasyParserParent } from "./EasyParser/EasyParserParent";
import { convertIAtomsToIFileInfoPDB } from "../ConvertMolModels/_ConvertIAtoms";
import { ISelAndStyle } from "@/Core/Styling/SelAndStyleInterfaces";


enum NodesOrModel {
    Nodes,
    Model,
}

const COLLAPSE_ONE_NODE_LEVELS = false;

/**
 * Helper function to generate default mol container (used throughout).
 *
 * @param  {string}       molName                            The name of the
 *                                                           container.
 * @param  {NodesOrModel} [nodesOrModel=NodesOrModel.NODES]  Whether to generate
 *                                                           nodes or model.
 * @returns {TreeNode}  The default mol container.
 */
function _getDefaultTreeNode(
    molName: string,
    nodesOrModel = NodesOrModel.Nodes
): TreeNode {
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
            : { nodes: new TreeNodeList() }),
    };

    return new TreeNode(obj);
}

/**
 * Divides a molecule into chains.
 *
 * @param  {any}     sel           The selection to divide (e.g., a selection
 *                                 that gets all protein atoms).
 * @param  {EasyParserParent} mol  The molecule with the atoms. Note that the
 *                                 atoms specified by sel end up getting
 *                                 removed, because the function moves them into
 *                                 their own molecules.
 * @param  {string}  molName       The name of the entry.
 * @returns {TreeNode} The molecule with the chains.
 */
function organizeSelByChain(
    sel: any,
    mol: EasyParserParent,
    molName: string
): TreeNode {
    let selectedAtoms = mol.selectedAtoms(sel, true);

    // If chain is " " for any atom, set it to "X"
    selectedAtoms = selectedAtoms.map((atom: IAtom) => {
        if (atom.chain === " ") {
            atom.chain = "X";
        }
        return atom;
    });

    const treeNode = _getDefaultTreeNode(molName);
    let lastChainID = "";
    selectedAtoms.forEach((atom: IAtom) => {
        const nodeList = treeNode.nodes as TreeNodeList;
        if (atom.chain !== lastChainID) {
            nodeList.push(
                new TreeNode({
                    title: atom.chain,
                    model: [],
                    viewerDirty: true,
                    treeExpanded: false,
                    visible: true,
                    selected: SelectedType.False,
                    focused: false,
                })
            );
            lastChainID = atom.chain;
        }

        (nodeList.get(nodeList.length - 1).model as IAtom[]).push(atom);
    });
    // mol.removeAtoms(selectedAtoms);

    return treeNode;
}

/**
 * Some molecular components don't need chains (e.g., solvents and ions). This
 * function flattens chains.
 *
 * @param  {TreeNode} treeNode The molecule (with chains) to flatten.
 * @returns {TreeNode} The flattened molecule.
 */
function flattenChains(treeNode: TreeNode): TreeNode {
    if (!treeNode.nodes) {
        throw new Error("No nodes found in treeNode.");
    }

    const flattened = _getDefaultTreeNode(treeNode.title, NodesOrModel.Model);

    treeNode.nodes.forEach((chain: TreeNode) => {
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
 * @param  {TreeNode} treeNode The molecule to divide.
 * @returns {TreeNode} The divided molecule.
 */
function divideChainsIntoResidues(treeNode: TreeNode): TreeNode {
    if (!treeNode.nodes) {
        return treeNode;
    }

    const dividedMolEntry = _getDefaultTreeNode(treeNode.title);

    let lastChainID = "";
    treeNode.nodes.forEach((chain: TreeNode) => {
        if (!chain.model) {
            // Already divided apparently.
            return;
        }

        if (chain.title === "" || chain.title === undefined) {
            // Default to chain A if not specified
            chain.title = "A";
        }

        if (chain.title !== lastChainID) {
            dividedMolEntry.nodes?.push(_getDefaultTreeNode(chain.title));
            lastChainID = chain.title;
        }

        let lastResidueID = "";
        (chain.model as IAtom[]).forEach((atom: IAtom) => {
            const chains = dividedMolEntry.nodes;
            if (!chains) {
                throw new Error("No chains found in dividedMolEntry.");
            }
            const residues = chains.get(chains.length - 1).nodes;
            if (!residues) {
                // Always exists. This here for typechecker.
                throw new Error("No residues found in dividedMolEntry.");
            }

            const newKey = residueID(atom);
            if (newKey !== lastResidueID) {
                residues.push(_getDefaultTreeNode(newKey, NodesOrModel.Model));
                lastResidueID = newKey;
            }
            const atoms = residues.get(residues.length - 1).model as IAtom[];
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
 * @param  {TreeNode} treeNode            The molecule to collapse.
 * @param  {boolean}       [childTitleFirst=false] When creating the merged
 *                                                 title, but the name of the
 *                                                 child molecule first.
 * @returns {TreeNode} The collapsed molecule.
 */
function collapseSingles(
    treeNode: TreeNode,
    childTitleFirst = false
): TreeNode {
    if (treeNode.nodes) {
        let anyNodeMerged = true;
        while (anyNodeMerged) {
            anyNodeMerged = false;

            const allNodes = new TreeNodeList([treeNode]).flattened;
            allNodes.forEach((anyNode: TreeNode) => {
                const anyNodeNodes = anyNode.nodes as TreeNodeList;
                if (anyNode.nodes && anyNodeNodes.length === 1) {
                    // 1 child node
                    const childNode = anyNodeNodes.get(0);
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

    if (treeNode.title.endsWith(":Compound")) {
        if (!treeNode.nodes || treeNode.nodes.length === 0) {
            // It has no children. Remove the "Compound" suffix.
            treeNode.title = treeNode.title.substring(
                0,
                treeNode.title.length - 9
            );
        } else {
            // It has children. Probably looks like "X:Compound"
            treeNode.title = treeNode.title.split(":")[1];
        }
    } else {
        // Looks like "Protein:A". Remove chain.
        treeNode.title = treeNode.title.split(":")[0];
    }

    return treeNode;
}

/**
 * Adds the molecule type.
 *
 * @param  {TreeNode}  treeNode  The molecule to add the type and style to.
 * @param  {ISelAndStyle[]} stylesAndSels The styles and selections to add.
 */
function addMolTypeAndStyle(treeNode: TreeNode, stylesAndSels: ISelAndStyle[]) {
    const molType = treeNode.type;
    new TreeNodeList([treeNode]).filters.onlyTerminal.forEach(
        (mol: TreeNode) => {
            mol.type = molType;
            mol.styles = stylesAndSels;
        }
    );

    new TreeNodeList([treeNode]).flattened.forEach((mol: TreeNode) => {
        mol.id = randomID();
        mol.treeExpanded = false;
        mol.visible = true;
        mol.viewerDirty = true;
    });
}

/**
 * Given molecular data, returns information about the format.
 *
 * @param  {IMolData} data  The molecular data.
 * @returns {IFormatInfo}  Information about the format.
 */
function getFormatInfo(data: IMolData): IFormatInfo {
    const molFormat = data.format;
    return getFormatInfoGivenType(molFormat) as IFormatInfo;
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

    // NOTE: If the file has been loaded through OpenBabel, it's already been
    // separated. But to keep the code organized, let's just process all
    // molecules the same way.

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
 * Given molecular text, tries to detect the name from the text itself. TODO:
 * Not currently using this function, but leave it if you need it.
 *
 * @param  {string} molText  The molecular text.
 * @param  {IFormatInfo} molFormatInfo  Information about the format.
 * @returns {string}  The name. Returns "" if no name found.
 */
function getNameFromContent(
    molText: string,
    molFormatInfo: IFormatInfo
): string {
    const regexps = molFormatInfo.extractMolNameRegex;
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
 * Given molecular data from the main thread, convert it into a TreeNode object
 * divided by component (protien, compound, solvent, etc.).
 *
 * @param  {IMolData} data The molecular data.
 * @returns {Promise<TreeNode>} The divided molecule.
 */
function dividePDBAtomsIntoDistinctComponents(
    data: IMolData
): Promise<TreeNodeList> {
    // Any molecules that share bonds are the same component.

    // Get the format
    const molFormatInfo = getFormatInfo(data);
    const frames = divideMolTxtIntoFrames(
        data.fileInfo.contents,
        molFormatInfo
    );

    const molName = getFileNameParts(data.fileInfo.name).basename;
    const frameTitles = frames.map((f, i) => {
        return `${getNameFromContent(f, molFormatInfo)}:${molName}:${i + 1}`;
    });

    const fileContentsAllFrames: TreeNodeList = new TreeNodeList();

    for (let frameIdx = 0; frameIdx < frames.length; frameIdx++) {
        const frame = frames[frameIdx];
        const frameTitle = frameTitles[frameIdx];
        const molWithAtomsToDivide = makeEasyParser({
            contents: frame,
            name: `tmp.${data.format}`,
        } as IFileInfo);

        if (molWithAtomsToDivide.length === 0) {
            // No atoms in model. Skip.
            continue;
        }

        // Check if has multiple frames
        let proteinAtomsByChain = organizeSelByChain(
            proteinSel,
            molWithAtomsToDivide,
            "Protein"
        );

        // Occasionally, an amino acids is acting as a ligand. In this case,
        // don't include it as part of the protein. A good example is 1M15.
        proteinAtomsByChain.nodes?.forEach((chain: TreeNode) => {
            if (!chain.model) {
                return;
            }

            const newProtModel = [] as IAtom[];

            for (const atom of chain.model as IAtom[]) {
                if (
                    atom.hetflag &&
                    standardProteinResidues.indexOf(atom.resn) !== -1
                ) {
                    // Add it back, because it's a standard protein residue, but
                    // marked as HETATM.
                    molWithAtomsToDivide.appendAtoms(atom);
                } else {
                    newProtModel.push(atom);
                }
            }

            if (newProtModel.length > 0) {
                // There are still some amino acids that are not HETATM. These
                // are protein, so keep them.
                chain.model = newProtModel;
            } else {
                // There are no amino acids that are not HETATM. Mark them for
                // removal.
                chain.model = undefined;
            }
        });
        // Remove empty chains
        if (proteinAtomsByChain.nodes) {
            proteinAtomsByChain.nodes = proteinAtomsByChain.nodes.filter(
                (n: TreeNode) => {
                    if (n.model) {
                        return (n.model as IAtom[]).length > 0;
                    }
                    return false;
                }
            );
        }

        let nucleicAtomsByChain = organizeSelByChain(
            nucleicSel,
            molWithAtomsToDivide,
            "Nucleic"
        );
        const solventAtomsByChain = organizeSelByChain(
            solventSel,
            molWithAtomsToDivide,
            "Solvent"
        );
        let metalAtomsByChain = organizeSelByChain(
            metalSel,
            molWithAtomsToDivide,
            "Metal"
        );

        // note modifying 3dmoljs selection to accomodate eazyParser format.
        let ionSelToUse = {};
        for (const sel of ionSel.or) {
            ionSelToUse = {
                ...ionSelToUse,
                ...sel,
            };
        }
        const ionAtomsByChain = organizeSelByChain(
            ionSelToUse,
            molWithAtomsToDivide,
            "Ion"
        );

        let lipidAtomsByChain = organizeSelByChain(
            lipidSel,
            molWithAtomsToDivide,
            "Lipid"
        );

        let compoundsByChain = organizeSelByChain(
            {},
            molWithAtomsToDivide,
            "Compound"
        );

        // Everything else is ligands

        // Further divide by residue (since each ligand is on its own residue,
        // not bound to any other).
        compoundsByChain = divideChainsIntoResidues(compoundsByChain);

        // If any of the terminal nodes on compoundsByChain contains
        // undefined, redefine it per the frame title.
        compoundsByChain.nodes?.terminals._nodes.forEach((n: TreeNode) => {
            if (n.title.indexOf("undefined") > -1) {
                n.title = frameTitle;
            }
        });

        // You don't need to divide solvent and ions by chain.
        const solventAtomsNoChain = flattenChains(solventAtomsByChain);
        const ionAtomsNoChain = flattenChains(ionAtomsByChain);

        // For everything else, if given chain has one item, collapse it.
        if (COLLAPSE_ONE_NODE_LEVELS) {
            compoundsByChain = collapseSingles(compoundsByChain, true);
            proteinAtomsByChain = collapseSingles(proteinAtomsByChain);
            nucleicAtomsByChain = collapseSingles(nucleicAtomsByChain);
            metalAtomsByChain = collapseSingles(metalAtomsByChain);
            lipidAtomsByChain = collapseSingles(lipidAtomsByChain);
        }

        proteinAtomsByChain.type = TreeNodeType.Protein;
        nucleicAtomsByChain.type = TreeNodeType.Nucleic;
        compoundsByChain.type = TreeNodeType.Compound;
        metalAtomsByChain.type = TreeNodeType.Metal;
        lipidAtomsByChain.type = TreeNodeType.Lipid;
        ionAtomsNoChain.type = TreeNodeType.Ions;
        solventAtomsNoChain.type = TreeNodeType.Solvent;

        let molName = data.fileInfo.name;

        // Remove extension from name
        molName = getFileNameParts(molName).basename;

        // Add name from content if you like (decided against it)
        // molName =
        //     molName +
        //     (frames.length > 1 ? ", " + (frameIdx + 1).toString() : "");
        // const molNameFromContent = getNameFromContent(frame, molFormatInfo);
        // if (molNameFromContent !== "") {
        //     molName = `${molNameFromContent}:${molName}`;
        // }

        // Page into single object
        let fileContents = new TreeNode({
            title: frameTitle, // molName,
            viewerDirty: true,
            treeExpanded: false,
            visible: true,
            focused: false,
            selected: SelectedType.False,
            nodes: new TreeNodeList([
                proteinAtomsByChain,
                nucleicAtomsByChain,
                compoundsByChain,
                metalAtomsByChain,
                lipidAtomsByChain,
                ionAtomsNoChain,
                solventAtomsNoChain,
            ]),
        });

        fileContents = cleanUpFileContents(fileContents);

        fileContentsAllFrames.push(fileContents);
    }

    return Promise.resolve(fileContentsAllFrames);
}

/**
 * Given molecular data from the main thread, convert it into a TreeNode object
 * divided by component (protien, compound, solvent, etc.). For mol2 files.
 *
 * @param  {IMolData} data The molecular data.
 * @returns {Promise<TreeNode>} The divided molecule.
 */
async function divideMol2AtomsIntoDistinctComponents(
    data: IMolData
): Promise<TreeNodeList> {
    // For Mol2, just assume its a compound. Assign chain A to all atoms.
    const molName = getFileNameParts(data.fileInfo.name).basename;

    // Put it all in a compound
    // let compoundsByChain = organizeSelByChain({}, molWithAtomsToDivide, "Compound");

    const molNode = _getDefaultTreeNode(molName, NodesOrModel.Model);
    molNode.model = data.fileInfo;
    molNode.type = TreeNodeType.Compound;

    const chainNode = _getDefaultTreeNode("A", NodesOrModel.Nodes);
    chainNode.type = TreeNodeType.Compound;

    const compoundNode = _getDefaultTreeNode("Compounds", NodesOrModel.Nodes);
    compoundNode.type = TreeNodeType.Compound;

    const rootNode = _getDefaultTreeNode(molName, NodesOrModel.Nodes);

    rootNode.nodes = new TreeNodeList([compoundNode]);
    compoundNode.nodes = new TreeNodeList([chainNode]);
    chainNode.nodes = new TreeNodeList([molNode]);

    return new TreeNodeList([rootNode]);
}

/**
 * Clean up the treeNode in preparation for sending it back to the main
 * worker.
 *
 * @param  {TreeNode} treeNode The treeNode to clean up.
 * @returns {TreeNode} The cleaned up treeNode.
 */
function cleanUpFileContents(treeNode: TreeNode): TreeNode {
    if (treeNode.nodes) {
        // Iterate through organizedAtoms. If object and has no keys, remove it.
        // If list and has length 0, remove it.
        // mol_filter_ok
        treeNode.nodes = treeNode.nodes.filter((m: TreeNode) => {
            let totalSubItems = 0;
            totalSubItems += m.nodes ? m.nodes.length : 0;
            totalSubItems += m.model ? (m.model as IAtom[]).length : 0;
            return totalSubItems > 0;
        });

        // Clean up issues. If it's text has "undefined:", replace that with "".
        // If it has more than one node, add plural to text in some cases.
        treeNode.nodes?.forEach((m: TreeNode) => {
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
        });
    }

    if (COLLAPSE_ONE_NODE_LEVELS) {
        treeNode = collapseSingles(treeNode);
    }

    return treeNode;
}

/**
 * Adds the parent ids to the nodes.
 *
 * @param  {TreeNode} treeNode  The treeNode to add the ids to.
 */
function addParentIds(treeNode: TreeNode) {
    const allNodes = new TreeNodeList([treeNode]).flattened;
    allNodes.forEach((anyNode: TreeNode) => {
        if (anyNode.nodes && anyNode.nodes.length > 0) {
            anyNode.nodes.forEach((node: TreeNode) => {
                node.parentId = anyNode.id;
            });
        }
    });
}

waitForDataFromMainThread()
    .then(async (molData: IMolData[]) => {
        if (molData.length === 0) {
            sendResponseToMainThread([]);
            return;
        }

        // Format MUST be pdb or mol2 here. Should have converted using
        // openbabel first.
        for (const molDatum of molData) {
            if (["pdb", "mol2"].indexOf(molDatum.format) === -1) {
                throw new Error(
                    `Format must be pdb or mol2. Got ${molDatum.format}.`
                );
            }
        }

        // NOTE: Ligands already divided into frames. No need to divide them.

        const promises = molData.map((d) => {
            if (d.format === "pdb") {
                return dividePDBAtomsIntoDistinctComponents(d);
            }

            // TODO: Need to implement this for mol2 files.
            return divideMol2AtomsIntoDistinctComponents(d);
        });

        const organizedAtomsFramesList = await Promise.all(promises);

        // Add source to all nodes
        for (let i = 0; i < organizedAtomsFramesList.length; i++) {
            for (let j = 0; j < organizedAtomsFramesList[i].length; j++) {
                organizedAtomsFramesList[i].get(j).src =
                    molData[i].fileInfo.name;
            }
        }

        // Merge into one list
        const organizedAtomsFrames = organizedAtomsFramesList[0];
        for (let i = 1; i < organizedAtomsFramesList.length; i++) {
            organizedAtomsFrames.extend(organizedAtomsFramesList[i]);
        }

        let organizedAtomsFramesFixed = new TreeNodeList();
        organizedAtomsFrames.forEach((organizedAtoms: TreeNode) => {
            organizedAtoms.id = randomID();

            const nodesToConsider = new TreeNodeList([organizedAtoms]);
            if (organizedAtoms.nodes) {
                nodesToConsider.extend(organizedAtoms.nodes);
            }

            nodesToConsider.forEach((node) => {
                // TODO: In theory, you shouldn't need to set styles here,
                // because they get reset in the main thread based on the
                // current styles in the viewer (see addToMainTree). And yet
                // when I remove styles setting from the worker, the solvent no
                // longer appears in the viewer. I tried to figure out why, but
                // struggled to find a solution. So I'm leaving it here for now.
                // NOTE: I'm pretty sure styles now no longer needs to be set
                // here, but leaving because I hope to refactor later.
                switch (node.type) {
                    case TreeNodeType.Protein:
                        addMolTypeAndStyle(node, defaultProteinStyle);
                        break;
                    case TreeNodeType.Nucleic:
                        addMolTypeAndStyle(node, defaultNucleicStyle);
                        break;
                    case TreeNodeType.Compound:
                        addMolTypeAndStyle(node, defaultLigandsStyle);
                        break;
                    case TreeNodeType.Metal:
                        addMolTypeAndStyle(node, defaultMetalsStyle);
                        break;
                    case TreeNodeType.Lipid:
                        addMolTypeAndStyle(node, defaultLipidStyle);
                        break;
                    case TreeNodeType.Ions:
                        addMolTypeAndStyle(node, defaultIonsStyle);
                        break;
                    case TreeNodeType.Solvent:
                        addMolTypeAndStyle(node, defaultSolventStyle);
                        break;
                }
            });

            addParentIds(organizedAtoms);

            organizedAtomsFramesFixed.push(organizedAtoms);
        });

        organizedAtomsFramesFixed = organizedAtomsFramesFixed.filter(
            (o: TreeNode) => {
                const hasNodes = o.nodes !== undefined && o.nodes.length > 0;
                const hasModel =
                    o.model !== undefined && (o.model as IAtom[]).length > 0;
                return hasNodes || hasModel;
            }
        );

        organizedAtomsFramesFixed.terminals.forEach((node: TreeNode) => {
            // If node.model is a list, it's a list of atoms that need to be
            // converted to pdb.
            if (Array.isArray(node.model)) {
                // Convert to pdb
                node.model = convertIAtomsToIFileInfoPDB(node.model);
            } else {
                // It's mol2, already in text format.
                node.model = {
                    name: "tmp.mol2",
                    contents: (node.model as IFileInfo).contents,
                } as IFileInfo;
            }
        });

        // const JSZip = await dynamicImports.jsZip.module;
        // const zip = new JSZip();
        // organizedAtomsFramesFixed.terminals.forEach(
        //     (node: TreeNode, idx: number) => {
        //         if (node.model) {
        //             zip.file("tmp.zip", (node.model as IFileInfo).contents);
        //             // const content = zip.generate({type : "string"});

        //             // Generate the compressed string
        //             // eslint-disable-next-line promise/no-nesting
        //             const ttt = zip.generateAsync({ type: "base64" })
        //             .then(function (
        //                 compressedString: string
        //             ) {
        //                 // Use or store your compressedString somewhere
        //                 console.log(compressedString);
        //                 return;
        //             });
        //         }
        //     }
        // );

        sendResponseToMainThread(organizedAtomsFramesFixed.serialize());

        return;
    })
    .catch((err: any) => {
        throw err;
    });
