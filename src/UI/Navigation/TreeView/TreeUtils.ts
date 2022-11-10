import { getFileNameParts } from "@/FileSystem/FilenameManipulation";
import { MolsToUse } from "@/UI/Forms/MoleculeInputParams/Types";
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
            if (mol.nodes) {
                allNodes = allNodes.concat(findNodes(mol.nodes));
            }
            allNodes.push(mol);
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
 * Remove a node of given id.
 *
 * @param  {string}          id    The id of the node to remove.
 * @param  {IMolContainer[]} mols  The array of IMolContainer to search.
 */
export function removeNode(id: string, mols: IMolContainer[]) {
    const node = getNodeOfId(id, mols);
    if (!node || !node.parentId) {
        return;
    }

    const parentNode = getNodeOfId(node.parentId, mols);
    if (!parentNode || !parentNode.nodes) {
        return;
    }

    parentNode.nodes = parentNode.nodes.filter((n) => n.id !== id);
}

/**
 * Add a node after another node.
 *
 * @param  {IMolContainer} nodeToAdd     The node to add.
 * @param  {IMolContainer} existingNode  The node to add after.
 * @param  {IMolContainer[]} mols        The array of IMolContainer to search.
 */
export function addNodeAfter(
    nodeToAdd: IMolContainer,
    existingNode: IMolContainer,
    mols: IMolContainer[]
) {
    if (!existingNode.parentId) {
        return;
    }

    // Get the parent node of existing node
    const parentNode = getNodeOfId(existingNode.parentId, mols);

    if (!parentNode || !parentNode.nodes) {
        return;
    }

    // Get index of existing node in the list.
    const existingNodeIndex = parentNode.nodes.findIndex(
        (n) => n.id === existingNode.id
    );

    // Insert the new node after the existing node.
    parentNode.nodes.splice(existingNodeIndex + 1, 0, nodeToAdd);

    // Update nodeToAdd parentId
    nodeToAdd.parentId = parentNode.id;
}

/**
 * Get the root (parent-most) nodes of a given type.
 *
 * @param  {IMolContainer[]} mols  The array of IMolContainer to search.
 * @param  {MolType}         type  The nodes type to find.
 * @returns {IMolContainer[]}  The array of root nodes of the given type.
 */
export function getRootNodesOfType(
    mols: IMolContainer[],
    type: MolType
): IMolContainer[] {
    // Think of this as the opposite of getTerminalNodes. Instead of getting the
    // nodes with no more children, you're getting the nodes whose parent type
    // is different.
    const allNodes = getAllNodesFlattened(mols);
    return allNodes.filter((node) => {
        if (node.type !== type) {
            return false;
        }
        if (node.parentId) {
            const parentNode = getNodeOfId(node.parentId, mols);
            if (parentNode) {
                return parentNode.type !== type;
            }
        }
        return true;
    });
}

/**
 * Filters molecules by "to-use" property.
 *
 * @param  {IMolContainer[]} molecules  The array of IMolContainer to filter.
 * @param  {MolsToUse}       molsToUse  The "to-use" property to filter by.
 * @returns {IMolContainer[]}  The filtered array of IMolContainer.
 */
function _filterMolsByUseProperty(
    molecules: IMolContainer[],
    molsToUse: MolsToUse
): IMolContainer[] {
    switch (molsToUse) {
        case MolsToUse.All:
            break;
        case MolsToUse.Visible:
            molecules = molecules.filter((m) => m.visible);
            break;
        case MolsToUse.Selected:
            molecules = molecules.filter(
                (m) => m.selected !== SelectedType.False
            );
            break;
        case MolsToUse.VisibleOrSelected:
            molecules = molecules.filter((m) => m.visible || m.selected);
            break;
        default:
            throw new Error("Invalid MoleculesToConsider value.");
    }

    return molecules;
}

/**
 * Gets the visible proteins. (Each protein may have multiple chains.)
 *
 * @param  {MolsToUse}        molsToUse  The kinds of molecule properties to
 *                                       filter by.
 * @param  {IMolContainer[]}  molecules  The list of molecules to consider.
 * @returns {IMolContainer[]}  The visible proteins.
 */
export function getProteinsToUse(
    molsToUse: MolsToUse,
    molecules: IMolContainer[]
): IMolContainer[] {
    // Get number of visible proteins (top-level menu items).

    const proteins = getRootNodesOfType(molecules, MolType.Protein);

    return _filterMolsByUseProperty(proteins, molsToUse);
}

/**
 * Gets the visible protein chains.
 *
 * @param  {MolsToUse}        molsToUse  The kinds of molecule properties to
 *                                       filter by.
 * @param  {IMolContainer[]}  molecules  The list of molecules to consider.
 * @returns {IMolContainer[]}  The visible protein chains.
 */
export function getProteinChainsToUse(
    molsToUse: MolsToUse,
    molecules: IMolContainer[]
): IMolContainer[] {
    // Get the number of chains (terminal nodes).

    const terminalNodes = getTerminalNodes(molecules);
    const proteinChains: IMolContainer[] = terminalNodes.filter(
        (m) => m.type === MolType.Protein
    );

    return _filterMolsByUseProperty(proteinChains, molsToUse);
}

/**
 * Gets the visible compounds.
 *
 * @param  {MolsToUse}       molsToUse  The kinds of molecule properties to
 *                                      filter by.
 * @param  {IMolContainer[]} molecules  The list of molecules to consider.
 * @returns {IMolContainer[]}  The visible compounds.
 */
export function getCompoundsToUse(
    molsToUse: MolsToUse,
    molecules: IMolContainer[]
): IMolContainer[] {
    const terminalNodes = getTerminalNodes(molecules);
    const compounds: IMolContainer[] = terminalNodes.filter(
        (m) => m.type === MolType.Compound
    );

    return _filterMolsByUseProperty(compounds, molsToUse);
}

/**
 * Gets a description of a molecule. Useful when you want to refer to a molecule
 * in text (not the heirarchical tree). If slugified, could be used as a
 * filename.
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

    return titles.join(":");
}
