import { randomID } from "@/Core/Utils";
import { getFileNameParts } from "@/FileSystem/FilenameManipulation";
import { IMolsToConsider } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/Types";
import {
    atomsToModels,
    modelsToAtoms,
} from "@/FileSystem/LoadSaveMolModels/Utils";
import { getStoreVar, setStoreVar } from "@/Store/StoreExternalAccess";
import { IMolContainer, MolType, SelectedType } from "./TreeInterfaces";

/**
 * Get all the nodes that are terminal (have a model, not sub-molecules).
 *
 * @param  {IMolContainer[]} mols  The array of IMolContainer to search.
 * @returns {IMolContainer[]}  The array of terminal nodes.
 */
export function getTerminalNodes(mols: IMolContainer[]): IMolContainer[] {
    /**
     * A recursive function to find the terminal leaves of mols.
     *
     * @param  {IMolContainer[]} mls  The array of IMolContainer to search.
     * @returns {IMolContainer[]}  The array of terminal nodes (leaves).
     */
    function findLeaves(mls: IMolContainer[]): IMolContainer[] {
        let leaves: IMolContainer[] = [];

        for (const mol of mls) {
            if (mol.nodes) {
                leaves = leaves.concat(findLeaves(mol.nodes));
            } else {
                leaves.push(mol);
            }
        }
        return leaves;
    }
    return findLeaves(mols);
}

/**
 * Gets all the nodes, whether terminal or not.
 *
 * @param  {IMolContainer[]} mols  The hierarchical array of IMolContainer to
 *                                 search.
 * @returns {IMolContainer[]}  The flat array of all nodes.
 */
export function getAllNodesFlattened(mols: IMolContainer[]): IMolContainer[] {
    /**
     * A recursive function to find the terminal leaves of mols.
     *
     * @param  {IMolContainer[]} mls  The hierarchical array of IMolContainer to
     *                                search.
     * @returns {IMolContainer[]}  The flat array of nodes.
     */
    function findNodes(mls: IMolContainer[]): IMolContainer[] {
        let allNodes: IMolContainer[] = [];

        for (const mol of mls) {
            allNodes.push(mol);
            if (mol.nodes) {
                allNodes = allNodes.concat(findNodes(mol.nodes));
            }
        }
        return allNodes;
    }
    return findNodes(mols);
}

/**
 * Find a node with a given id.
 *
 * @param  {string}          id    The id of the node to find.
 * @param  {IMolContainer[]} mols  The array of IMolContainer to search.
 * @returns {IMolContainer | null}  The node with the given id, or null if not
 *     found.
 */
export function getNodeOfId(
    id: string,
    mols: IMolContainer[]
): IMolContainer | null {
    /**
     * A recursive function to find the node of id.
     *
     * @param  {IMolContainer[]} mls  The array of IMolContainer to search.
     * @param  {string}          i    The id of the node to find.
     * @returns {IMolContainer | null}  The node with the given id, or null if
     *                                  not.
     */
    function findNode(mls: IMolContainer[], i: string): IMolContainer | null {
        for (const mol of mls) {
            if (mol.id === i) {
                return mol;
            }
            if (mol.nodes) {
                const node = findNode(mol.nodes, i);
                if (node !== null) {
                    return node;
                }
            }
        }
        return null;
    }
    return findNode(mols, id);
}

/**
 * Find all nodes with a given type.
 *
 * @param  {IMolContainer[]} mols                 The array of IMolContainer to
 *                                                search.
 * @param  {MolType}         type                 The nodes types to find.
 * @param  {boolean}         [onlyVisible=false]  Whether to consider visible
 *                                                nodes alone.
 * @returns {IMolContainer[]}  The array of nodes with the given type.
 */
export function getNodesOfType(
    mols: IMolContainer[],
    type: MolType,
    onlyVisible = false
): IMolContainer[] {
    let nodesToConsider = getAllNodesFlattened(mols);
    nodesToConsider = nodesToConsider.filter((node) => node.type === type);

    if (onlyVisible) {
        nodesToConsider = nodesToConsider.filter((node) => node.visible);
    }

    // Note that children of compounds also marked compounds, so no need to
    // explicitly search for/include children.

    return nodesToConsider;
}

/**
 * Gets a description of a molecule. Useful when you want to refer to a molecule
 * in text (not the heirarchical tree). If slugified, could be used as a
 * filename. TODO: Not currently used, but I think it should be.
 *
 * @param  {IMolContainer}    mol                          The molecule to
 *                                                         describe.
 * @param  {IMolContainer[]}  molContainers                The list of all
 *                                                         molecules.
 * @param  {boolean}          [noCategoryComponent=false]  Whether to include
 *                                                         the category
 *                                                         component of the
 *                                                         description
 *                                                         ("protein",
 *                                                         "compound", "metal",
 *                                                         etc.).
 * @returns {string}  The description.
 */
export function getMolDescription(
    mol: IMolContainer,
    molContainers: IMolContainer[],
    noCategoryComponent = false
): string {
    // If it has no parent, just return it's title.
    let curMol: IMolContainer | null = mol;
    const titles = [getFileNameParts(curMol.title as string).basename];

    while (curMol.parentId) {
        curMol = getNodeOfId(curMol.parentId, molContainers);
        if (curMol) {
            // Add to top of list
            titles.unshift(getFileNameParts(curMol.title as string).basename);
            continue;
        }
        break;
    }

    if (noCategoryComponent && (titles.length > 2 || titles[1] === "Protein")) {
        // Remove one in position 1 ("protein", "compound", "metal", etc.)
        titles.splice(1, 1);
    }

    return titles.join(":").split("(")[0].trim();
}

/**
 * Given a list of IMolContainer, returns only those with unique ids.
 *
 * @param  {IMolContainer[]} molContainers  The list of IMolContainer to filter.
 * @returns {IMolContainer[]} The filtered list.
 */
export function keepUniqueMolContainers(
    molContainers: IMolContainer[]
): IMolContainer[] {
    return molContainers.filter(
        (node, index, self) => index === self.findIndex((t) => t.id === node.id)
    );
}

/**
 * Given a IMolsToConsider variable, gets the molecules to consider.
 *
 * @param  {IMolsToConsider} molsToConsider   The molsToUse variable.
 * @param  {IMolContainer[]} [terminalNodes]  The list of molecules to consider.
 *                                            If undefined, gets all molecules
 *                                            from VueX store.
 * @returns {IMolContainer[]}  The molecules to consider.
 */
export function getTerminalNodesToConsider(
    molsToConsider: IMolsToConsider,
    terminalNodes?: IMolContainer[]
): IMolContainer[] {
    if (terminalNodes === undefined) {
        terminalNodes = getStoreVar("molecules");
    }

    // Get the terminal nodes
    terminalNodes = getTerminalNodes(terminalNodes as IMolContainer[]);

    let molsToKeep: IMolContainer[] = [];

    if (molsToConsider.visible) {
        molsToKeep.push(...terminalNodes.filter((m) => m.visible));
    }

    if (molsToConsider.selected) {
        molsToKeep.push(
            ...terminalNodes.filter((m) => m.selected !== SelectedType.False)
        );
    }

    if (molsToConsider.hiddenAndUnselected) {
        molsToKeep.push(
            ...terminalNodes.filter(
                (m) => !m.visible && m.selected === SelectedType.False
            )
        );
    }

    // Make sure there are no duplicates (visible and selected, for example).
    molsToKeep = keepUniqueMolContainers(molsToKeep);

    return molsToKeep;
}

/**
 * Remove a node of given id.
 *
 * @param  {string | IMolContainer | null} node  The id of the node to remove,
 *                                               or the node itself.
 */
export function removeNode(node: string | IMolContainer | null) {
    const mols = getStoreVar("molecules");
    if (typeof node === "string") {
        node = getNodeOfId(node, mols);
    }
    if (!node) {
        // Node doesn't exist.
        return;
    }

    let id = node.id;

    if (!node.parentId) {
        // It's a root node, without a parent id.
        setStoreVar(
            "molecules",
            mols.filter((n: IMolContainer) => n.id !== id)
        );
        return;
    }

    // If you get here, node is not string or null, but must be IMolContainer.
    let curNode = getNodeOfId(node.parentId, mols);

    // Could be that in removing this node, parent node has no children. Delete
    // that too, up the tree (because these are not terminal nodes, and if a
    // non-terminal node doens't have any children, there's no reason for it to
    // exist).
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (!curNode) {
            // Parent node does not exist. Something's wrong.
            break;
        }

        if (!curNode.nodes) {
            // Parent node has no children, something's wrong.
            break;
        }

        curNode.nodes = curNode.nodes.filter((n) => n.id !== id);
        if (curNode.nodes.length > 0) {
            // Parent node still has children (siblings of just deleted), so
            // we're done.
            break;
        }

        if (!curNode.parentId) {
            // No parent node, so we're done
            break;
        }

        // Go up to parent.
        id = curNode.id as string;
        curNode = getNodeOfId(curNode.parentId, mols);

        if (!curNode) {
            // No parent node, so we're done. Already checked using parentId,
            // but you need this here for typescript.
            break;
        }
    }
}

export function getNodeAncestory(node: string | IMolContainer | null, mols: IMolContainer[]) {
    if (typeof node === "string") {
        node = getNodeOfId(node, mols);
    }
    
    if (!node) {
        return [];
    }

    // If you get here, node is of type IMolContainer.

    let curNode = node;
    const ancestors: IMolContainer[] = [node];
    while (curNode.parentId) {
        const parentNode = getNodeOfId(curNode.parentId, mols);

        if (parentNode === null) {
            break;
        }

        // Add at first position
        ancestors.unshift(parentNode);
        curNode = parentNode;
    }

    return ancestors;
}

export function cloneMols(
    molContainers: IMolContainer[],
    includeAncestors = true
): Promise<IMolContainer[]> {
    const allMols = getStoreVar("molecules");
    const promises: Promise<IMolContainer>[] = [];

    for (const nodeToActOn of molContainers) {
        // Get ancestors if includeAncestors specified
        let nodeGenealogy: IMolContainer[];
        if (includeAncestors) {
            nodeGenealogy = getNodeAncestory(nodeToActOn.id as string, allMols);

            // Make copies (except models still by ref) of all the nodes in the
            // ancestory, emptying the nodes except for the last one.
            for (let i = 0; i < nodeGenealogy.length; i++) {
                // Copy the node, because you'll be modifying it.
                nodeGenealogy[i] = {
                    ...nodeGenealogy[i],
                };

                // Empty the nodes, except for the last one. (the modification)
                if (i < nodeGenealogy.length - 1) {
                    nodeGenealogy[i].nodes = [];
                }
            }

            // Place each node in the ancestory under the next node.
            for (let i = 0; i < nodeGenealogy.length - 1; i++) {
                nodeGenealogy[i].nodes?.push(nodeGenealogy[i + 1]);

                // Also, parentId
                nodeGenealogy[i + 1].parentId = nodeGenealogy[i].id;
            }
        } else {
            // No ancestors. Just include this one.
            nodeGenealogy = [{ ...nodeToActOn }];
        }

        // You must copy {...node} everything from last item of nodeGenealogy
        // down to bottom (children). Note that this doesn't make a copy of the
        // model, though, just everything else.
        const _recurse = (nodes: IMolContainer[]) => {
            for (const node of nodes) {
                node.nodes = node.nodes?.map((n) => ({ ...n }));
                node.nodes?.forEach((n) => {
                    _recurse([n]);
                });
            }
        };
        _recurse([nodeGenealogy[nodeGenealogy.length - 1]]);

        let topNode = nodeGenealogy[0];

        // Now you must redo all ids because they should be distinct from the
        // original copy.
        const allNodesFlattened = [topNode];
        if (topNode.nodes) {
            allNodesFlattened.push(...getAllNodesFlattened(topNode.nodes));
        }
        const oldIdToNewId = new Map<string, string>();
        for (const node of allNodesFlattened) {
            oldIdToNewId.set(node.id as string, randomID());
        }
        for (const node of allNodesFlattened) {
            node.id = oldIdToNewId.get(node.id as string);
            if (node.parentId) {
                node.parentId = oldIdToNewId.get(node.parentId);
            }
            node.selected = SelectedType.False;
            node.viewerDirty = true;
            node.focused = false;
        }

        // then make copes of all models. modelsToAtoms => atomsToModels
        topNode = modelsToAtoms(topNode);
        promises.push(atomsToModels(topNode));

        //     // Cloning the molecule. Make a deep copy of the node.
        //     nodeToActOn = modelsToAtoms(nodeToActOn);
        //     clonedNode = atomsToModels(nodeToActOn)
        //         .then((node) => {
        //             // Get the nodes ancestory
        //             const nodeGenealogy: IMolContainer[] = getNodeAncestory(
        //                 node.id as string,
        //                 allMols
        //             );

        //             // Make copies of all the nodes in the ancestory, emptying the nodes
        //             // except for the last one.
        //             for (let i = 0; i < nodeGenealogy.length; i++) {
        //                 nodeGenealogy[i] = {
        //                     ...nodeGenealogy[i],
        //                 };

        //                 if (i < nodeGenealogy.length - 1) {
        //                     nodeGenealogy[i].nodes = [];
        //                 }
        //             }

        //             // Place each node in the ancestory under the next node.
        //             for (let i = 0; i < nodeGenealogy.length - 1; i++) {
        //                 nodeGenealogy[i].nodes?.push(nodeGenealogy[i + 1]);

        //                 // Also, parentId
        //                 nodeGenealogy[i + 1].parentId = nodeGenealogy[i].id;
        //             }

        //             const topNode = nodeGenealogy[0];

        //             // Now you must redo all ids because they could be distinct from the
        //             // original copy.
        //             const allNodesFlattened = [topNode];
        //             if (topNode.nodes) {
        //                 allNodesFlattened.push(
        //                     ...getAllNodesFlattened(topNode.nodes)
        //                 );
        //             }
        //             const oldIdToNewId = new Map<string, string>();
        //             for (const node of allNodesFlattened) {
        //                 oldIdToNewId.set(node.id as string, randomID());
        //             }
        //             for (const node of allNodesFlattened) {
        //                 node.id = oldIdToNewId.get(node.id as string);
        //                 if (node.parentId) {
        //                     node.parentId = oldIdToNewId.get(node.parentId);
        //                 }
        //                 node.selected = SelectedType.False;
        //                 node.viewerDirty = true;
        //                 node.focused = false;
        //             }
        //         });
    }

    return Promise.all(promises);
}
