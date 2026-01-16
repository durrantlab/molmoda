import { IMolsToConsider } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/Types";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TreeNode } from "../../../TreeNodes/TreeNode/TreeNode";
import { SelectedType, TreeNodeType } from "./TreeInterfaces";
import { TreeNodeList } from "../../../TreeNodes/TreeNodeList/TreeNodeList";
import { treeNodeDeepClone } from "../../../TreeNodes/Deserializers";
import { makeEasyParser } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser";
import { EasyParserParent } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser/EasyParserParent";
import * as api from "@/Api";
import { YesNo } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";

/**
 * Selects nodes in a list based on a condition function.
 *
 * @param {TreeNodeList} treeNodeList  The list of nodes to process.
 * @param {(node: TreeNode) => boolean} conditionFunc  Returns true if the node should be selected.
 */
export function selectNodesBasedOnCondition(
    treeNodeList: TreeNodeList,
    conditionFunc: (node: TreeNode) => boolean
) {
    const allNodes = treeNodeList.flattened;
    allNodes.forEach((n) => {
        if (conditionFunc(n)) {
            n.selected = SelectedType.True;
        } else {
            n.selected = SelectedType.False;
        }
    });
}

/**
 * Given a IMolsToConsider variable, gets the molecules to consider.
 *
 * @param  {IMolsToConsider} molsToConsider   The molsToUse variable.
 * @param  {TreeNodeList} [terminalNodes]  The list of molecules to consider.
 *                                            If undefined, gets all molecules
 *                                            from VueX store.
 * @returns {TreeNodeList}  The molecules to consider.
 */
export function getTerminalNodesToConsider(
    molsToConsider: IMolsToConsider,
    terminalNodes?: TreeNodeList
): TreeNodeList {
    if (terminalNodes === undefined) {
        terminalNodes = getMoleculesFromStore();
    }

    // Get the terminal nodes
    terminalNodes = terminalNodes.filters.onlyTerminal;

    let molsToKeep = new TreeNodeList();

    if (molsToConsider.visible) {
        molsToKeep.extend(terminalNodes.filters.keepVisible());
    }

    if (molsToConsider.selected) {
        molsToKeep.extend(terminalNodes.filters.keepSelected());
    }

    if (molsToConsider.hiddenAndUnselected) {
        molsToKeep.extend(
            // mol_filter_ok
            terminalNodes.filter(
                (m: TreeNode) => !m.visible && m.selected === SelectedType.False
            )
        );
    }

    // Make sure there are no duplicates (visible and selected, for example).
    molsToKeep = molsToKeep.filters.onlyUnique;

    return molsToKeep;
}

/**
 * Clones a list of molecules, optionally including their ancestors (direct) and
 * all children. Also assigns new ids, etc. Can't be under TreeNodeList because
 * it calls treeNodeDeepClone (circular dependencies).
 *
 * @param  {TreeNodeList} treeNodeList        The list of molecules to clone.
 * @param  {boolean}  [includeAncestors=true]  If true, includes the ancestors
 *                                             of the molecules in the clone.
 * @returns {Promise<TreeNodeList>}  A promise that resolves the cloned list of
 *     molecules.
 */
export function cloneMolsWithAncestry(
    treeNodeList: TreeNodeList,
    includeAncestors = true
): Promise<TreeNodeList> {
    const allMols = getMoleculesFromStore();
    const promises: Promise<TreeNode>[] = [];

    treeNodeList.forEach((nodeToActOn: TreeNode) => {
        // Get ancestors if includeAncestors specified
        let nodeGenealogy: TreeNodeList;
        if (includeAncestors) {
            // nodeGenealogy = getNodeAncestory(nodeToActOn.id as string, allMols);
            nodeGenealogy = nodeToActOn.getAncestry(allMols);

            // Make shallow copies of all the nodes in the ancestory
            for (let i = 0; i < nodeGenealogy.length; i++) {
                // nodeGenealogy.set(i, new TreeNode({ ...nodeGenealogy.get(i) }));
                const clonedNode = nodeGenealogy.get(i).shallowCopy();
                nodeGenealogy.set(i, clonedNode);
            }

            // Empty the nodes except for the last one (which is the same as
            // nodeToActOn). To avoid including sibling nodes (outside of this
            // ancestory).
            for (let i = 0; i < nodeGenealogy.length - 1; i++) {
                // TODO: This is clearing nodes from main molecule. Has not made
                // copies
                nodeGenealogy.get(i).clearChildren();
            }

            // Place each node in the ancestory under the next node.
            for (let i = 0; i < nodeGenealogy.length - 1; i++) {
                nodeGenealogy.get(i).nodes?.push(nodeGenealogy.get(i + 1));

                // Also, parentId
                nodeGenealogy.get(i + 1).parentId = nodeGenealogy.get(i).id;
            }
        } else {
            // No ancestors requested. Just include this one.
            nodeGenealogy = new TreeNodeList([nodeToActOn.shallowCopy()]);
        }

        // Now you must make a deep copy of everything from the top node down,
        // including children of current nodeToActOn.
        const clonedTree = treeNodeDeepClone(nodeGenealogy.get(0), true)
            .then((topNode: TreeNode): TreeNode => {
                // Get all the nodes as a flat TreeNodeList, including topNode. This
                // is just to make it easier to process each node.
                const allNodesFlattened = new TreeNodeList([topNode]);
                const children = topNode.nodes;
                if (children) {
                    allNodesFlattened.extend(children.flattened);
                }

                // Also unselect, unfocus, and mark as viewerDirty.
                allNodesFlattened.forEach((node: TreeNode) => {
                    node.selected = SelectedType.False;
                    node.viewerDirty = true;
                    node.focused = false;
                });

                return topNode;
            })
            .catch((err: Error) => {
                throw err;
            });

        promises.push(clonedTree);
    });

    return Promise.all(promises).then((treeNodes: TreeNode[]) => {
        return new TreeNodeList(treeNodes);
    });
}

/**
 * Merges a list of molecules into a single molecule.
 *
 * @param  {TreeNodeList} nodeList               The list of molecules to merge.
 * @param  {string}       [newName="mergedMol"]  The name of the new merged
 *                                               molecule.
 * @returns {Promise<TreeNode>}  A promise that resolves the merged molecule.
 */
export function mergeTreeNodes(
    nodeList: TreeNodeList,
    newName = "mergedMol"
): Promise<TreeNode> {
    // Start by deepcloning all the molecules
    return Promise.all(
        nodeList.map((node: TreeNode) => {
            return treeNodeDeepClone(node, true); // reid
        })
    )
        .then((nodeList: TreeNode[]) => {
            const merged = nodeList[0];
            for (let i = 1; i < nodeList.length; i++) {
                merged.mergeInto(nodeList[i]);
            }
            merged.title = newName;
            return merged;
        })
        .catch((err: Error) => {
            throw err;
        });

    // const treeNode = nodeList.get(0);

    // // Keep going through the nodes of each container and merge them into the
    // // first container.
    // for (let i = 1; i < nodeList.length; i++) {
    //     const treeNode = nodeList.get(i);

    //     // Get the terminal nodes
    //     const terminalNodes = new TreeNodeList([treeNode]).filters
    //         .onlyTerminal;

    //     // Get ancestry of each terminal node
    //     terminalNodes.forEach((terminalNode) => {
    //         const ancestry = terminalNode.getAncestry(
    //             new TreeNodeList([treeNode])
    //         );

    //         // Remove first one, which is the root node
    //         ancestry.shift();

    //         let treeNodePointer = treeNode;
    //         const mergedMolNodesTitles = treeNodePointer.nodes?.map(
    //             (node: TreeNode) => node.title
    //         ) as string[];

    //         while (
    //             mergedMolNodesTitles?.indexOf(ancestry.get(0).title) !== -1
    //         ) {
    //             if (!mergedTreeNodePointer.nodes) {
    //                 // When does this happen?
    //                 break;
    //             }

    //             // Update the pointer
    //             mergedTreeNodePointer =
    //                 mergedTreeNodePointer.nodes.find(
    //                     (node: TreeNode) => node.title === ancestry.get(0).title
    //                 ) as TreeNode;

    //             // Remove the first node from the ancestry
    //             ancestry.shift();
    //         }

    //         // You've reached the place where the node should be added. First,
    //         // update its parentId.
    //         const nodeToAdd = ancestry.get(0);
    //         nodeToAdd.parentId = mergedTreeNodePointer.id;

    //         // And add it
    //         mergedTreeNodePointer.nodes?.push(nodeToAdd);
    //     });
    // }

    // mergedTreeNode.title = newName;

    // return mergedTreeNode;
}

/**
 * Retrieves unique residue names and IDs from all currently visible terminal
 * molecular models.
 *
 * @returns {{ names: string[], ids: number[] }} An object containing an
 *  alphabetically sorted array of unique residue names and a numerically
 *  sorted array of unique residue IDs.
 */
export function getUniqueResiduesFromVisibleMolecules(): {
    names: string[];
    ids: number[];
} {
    const allMolecules: TreeNodeList = getMoleculesFromStore();
    const visibleTerminalNodes: TreeNodeList =
        allMolecules.filters.onlyTerminal.filters.keepVisible();
    const allResidueNames = new Set<string>();
    const allResidueIds = new Set<number>();
    visibleTerminalNodes.forEach((node: TreeNode) => {
        if (node.model) {
            const parser: EasyParserParent = makeEasyParser(node.model);
            const { names: nodeResNames, ids: nodeResIds } =
                parser.getUniqueResidues();
            nodeResNames.forEach((name) => allResidueNames.add(name));
            nodeResIds.forEach((id) => allResidueIds.add(id));
        }
    });
    return {
        names: Array.from(allResidueNames).sort(),
        ids: Array.from(allResidueIds).sort((a, b) => a - b),
    };
}


/**
 * Organizes a flat list of terminal TreeNode objects into a standard hierarchical structure.
 *
 * @param {TreeNode[]} treeNodes The flat list of terminal nodes to organize.
 * @param {string} rootTitle The title for the root node of the new hierarchy.
 * @param {boolean} [divideCompoundsByChain=true] Whether to group compounds by chain.
 * @returns {TreeNode} The new root TreeNode containing the organized hierarchy.
 */
export function organizeNodesIntoHierarchy(
    treeNodes: TreeNode[],
    rootTitle: string,
    divideCompoundsByChain = true
): TreeNode {
    // Divide the nodes into categories for all possible types.
    const categories: { [key: string]: any } = {};
    for (const treeNode of treeNodes) {
        if (treeNode.type) {
            let categoryName =
                treeNode.type.charAt(0).toUpperCase() + treeNode.type.slice(1);
            if (
                [
                    TreeNodeType.Compound,
                    TreeNodeType.Metal,
                    TreeNodeType.Lipid,
                    TreeNodeType.Ions,
                ].includes(treeNode.type)
            ) {
                categoryName += "s";
            }
            if (!categories[categoryName]) {
                categories[categoryName] = [];
            }
            categories[categoryName].push(treeNode);
        }
    }
    // Further divide the Compounds into chains.
    if (categories["Compounds"]) {
        if (divideCompoundsByChain) {
            const compounds = categories["Compounds"];
            const newCompounds: { [key: string]: TreeNode[] } = {};
            // Fallback list of chains to assign if a compound has NO chain defined.
            const availableChainsOrig = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
            for (const treeNode of compounds) {
                const chain = getChain(treeNode, availableChainsOrig);
                if (!newCompounds[chain]) {
                    newCompounds[chain] = [];
                }
                newCompounds[chain].push(treeNode);
            }
            categories["Compounds"] = newCompounds;
        } else {
            categories["Compounds"] = {
                A: categories["Compounds"],
            };
        }
    }
    // Create the root node
    const rootNode = new TreeNode({
        title: rootTitle,
        treeExpanded: false,
        visible: true,
        selected: SelectedType.False,
        focused: false,
        viewerDirty: true,
        nodes: new TreeNodeList([]),
    });
    const categoryOrder = [
        "Protein",
        "Nucleic",
        "Compounds",
        "Metals",
        "Lipids",
        "Ions",
        "Solvent",
    ];
    const titleToTypeMap: Map<string, TreeNodeType> = new Map([
        ["Protein", TreeNodeType.Protein],
        ["Nucleic", TreeNodeType.Nucleic],
        ["Compounds", TreeNodeType.Compound],
        ["Metals", TreeNodeType.Metal],
        ["Lipids", TreeNodeType.Lipid],
        ["Ions", TreeNodeType.Ions],
        ["Solvent", TreeNodeType.Solvent],
    ]);
    for (const title of categoryOrder) {
        const type = titleToTypeMap.get(title);
        if (!type || !categories[title] || categories[title].length === 0) {
            continue;
        }
        const categoryNode = new TreeNode({
            title: title,
            treeExpanded: false,
            visible: true,
            selected: SelectedType.False,
            focused: false,
            viewerDirty: true,
            type: type,
            nodes: new TreeNodeList([]),
        });
        rootNode.nodes?.push(categoryNode);
        if (title === "Compounds") {
            for (const chain of Object.keys(categories[title])) {
                const chainNode = new TreeNode({
                    title: chain as string,
                    treeExpanded: false,
                    visible: true,
                    selected: SelectedType.False,
                    focused: false,
                    viewerDirty: true,
                    type: type,
                    nodes: new TreeNodeList(categories[title][chain]),
                });
                categoryNode.nodes?.push(chainNode);
            }
        } else {
            // Logic for other categories that are grouped by chain directly
            const availableChainsOrig = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
            for (const treeNode of categories[title]) {
                const chain = getChain(treeNode, availableChainsOrig);
                treeNode.title = chain as string;
                categoryNode.nodes?.push(treeNode);
            }
        }
    }
    return rootNode;
}

/**
 * Gets the chain of a given tree node.
 *
 * @param {TreeNode} treeNode The tree node.
 * @param {string[]} availableChains The available chains to use if the node has no chain.
 * @returns {string} The chain.
 */
function getChain(treeNode: TreeNode, availableChains: string[]): string {
    let chain: string | undefined = undefined;
    if (!treeNode.model) {
        // If there's no model, use first available chain from the fallback list.
        chain = availableChains.shift();
    } else {
        const firstAtom = makeEasyParser(treeNode.model).getAtom(0);
        if (!firstAtom) {
            // If there are no atoms in the model, use first available chain.
            chain = availableChains.shift();
        } else {
            const firstAtomChain = firstAtom.chain;
            if (firstAtomChain === "" || firstAtomChain === undefined) {
                // If the first atom has no chain, use first available chain.
                chain = availableChains.shift();
            } else {
                // Use the actual chain from the molecule.
                chain = firstAtomChain;
            }
        }
    }
    return chain || "A"; // Fallback to 'A' if everything else fails
}

/**
 * Given a list of tree nodes, flattens them to terminals and organizes them into a standard hierarchy.
 *
 * @param {TreeNode[]} treeNodes The tree nodes to organize.
 * @param {string} rootNodeTitle The title for the root node of the new hierarchy.
 * @param {boolean} [divideCompoundsByChain=true] Whether to divide compounds by chain.
 * @returns {TreeNode} The root tree node of the loaded tree.
 */
export function loadHierarchicallyFromTreeNodes(
    treeNodes: TreeNode[],
    rootNodeTitle: string,
    divideCompoundsByChain = true
): TreeNode {
    // Consider only the terminal nodes
    const allTreeNodes: TreeNode[] = [];
    for (const treeNode of treeNodes) {
        if (treeNode.nodes) {
            const terminalNodes = treeNode.nodes.terminals;
            const nodes = terminalNodes._nodes;
            if (nodes.length === 1) {
                nodes[0].title = treeNode.title;
            } else {
                for (let i = 0; i < nodes.length; i++) {
                    nodes[i].title = `${treeNode.title}:${i + 1}`;
                }
            }
            allTreeNodes.push(...nodes);
        } else {
            allTreeNodes.push(treeNode);
        }
    }
    return organizeNodesIntoHierarchy(
        allTreeNodes,
        rootNodeTitle,
        divideCompoundsByChain
    );
}

/**
 * Toggles visibility of a list of nodes. If too many nodes are to become
 * visible, it prompts the user for confirmation.
 *
 * @param {TreeNodeList} nodesToToggle The list of nodes whose visibility should
 *      be toggled.
 */
export async function toggleVisibilityWithConfirmation(
    nodesToToggle: TreeNodeList
): Promise<void> {
    if (nodesToToggle.length === 0) {
        return;
    }

    // Determine the new visibility state. If any node is visible, all will be hidden.
    const anyVisible = nodesToToggle.some((n) => n.visible);
    const newVisibleState = !anyVisible;

    const performToggle = () => {
        nodesToToggle.forEach((nodeToToggle: TreeNode) => {
            nodeToToggle.visible = newVisibleState; // This setter will propagate to children.
            nodeToToggle.viewerDirty = true;
        });
    };

    if (newVisibleState) {
        // Only prompt when making nodes visible
        const allAffectedTerminals = new TreeNodeList();
        nodesToToggle.forEach((node) => {
            if (node.model) {
                // is terminal
                allAffectedTerminals.push(node);
            } else if (node.nodes) {
                // is container
                allAffectedTerminals.extend(node.nodes.terminals);
            }
        });

        const uniqueTerminals = allAffectedTerminals.filters.onlyUnique;
        const countToMakeVisible = uniqueTerminals.filter(
            (n) => !n.visible
        ).length;
        const visibilityThreshold = await getSetting("initialCompoundsVisible");
        if (countToMakeVisible > visibilityThreshold) {
            const resp = await api.messages.popupYesNo(
                `You are about to make ${countToMakeVisible} molecules visible at once. This may impact performance. Do you want to continue?`,
                "Performance Warning",
                "Yes, Continue",
                "Cancel"
            );
            if (resp === YesNo.Yes) {
                performToggle();
            }
            // If No or Cancel, do nothing.
        } else {
            performToggle();
        }
    } else {
        // Hiding nodes doesn't need a warning
        performToggle();
    }
}
