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

    nodesToConsider = extractFlattenedContainers(nodesToConsider, {
        type: type,
    });

    if (onlyVisible) {
        nodesToConsider = extractFlattenedContainers(nodesToConsider, {
            visible: true,
        });
    }

    // Note that children of compounds also marked compounds, so no need to
    // explicitly search for/include children.

    return nodesToConsider;
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
    // mol_filter_ok
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
        molsToKeep.push(
            ...extractFlattenedContainers(terminalNodes, { visible: true })
        );
    }

    if (molsToConsider.selected) {
        molsToKeep.push(
            ...extractFlattenedContainers(terminalNodes, { selected: true })
        );
    }

    if (molsToConsider.hiddenAndUnselected) {
        molsToKeep.push(
            // mol_filter_ok
            ...terminalNodes.filter(
                (m: IMolContainer) =>
                    !m.visible && m.selected === SelectedType.False
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
            extractFlattenedContainers(mols, { notId: id })
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

        curNode.nodes = extractFlattenedContainers(curNode.nodes, {
            notId: id,
        });
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

/**
 * Get a nodes ancestory.
 *
 * @param  {string|IMolContainer|null} node  The node. Can be id, or node
 *                                           itself.
 * @param  {IMolContainer[]}           mols  The list of molecules to search.
 * @returns {IMolContainer[]}  The list of nodes in the ancestory.
 */
export function getNodeAncestory(
    node: string | IMolContainer | null,
    mols: IMolContainer[]
): IMolContainer[] {
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

/**
 * Clones a list of molecules.
 *
 * @param  {IMolContainer[]} molContainers            The list of molecules to
 *                                                    clone.
 * @param  {boolean}         [includeAncestors=true]  If true, includes the
 *                                                    ancestors of the molecules
 *                                                    in the clone.
 * @returns {Promise<IMolContainer[]>}  A promise that resolves the cloned list
 *     of molecules.
 */
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

        // Make copies of all the shapes.
        for (const node of allNodesFlattened) {
            if (node.shape) {
                node.shape = JSON.parse(JSON.stringify(node.shape));
            }
        }

        // then make copes of all models. modelsToAtoms => atomsToModels
        topNode = modelsToAtoms(topNode);
        promises.push(atomsToModels(topNode));
    }

    return Promise.all(promises);
}

/**
 * Gets a description of a molecule. Useful when you want to refer to a molecule
 * in text (not the heirarchical tree). If slugified, could be used as a
 * filename. TODO: Not currently used.
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
 * Gets the name of the molecule in path-like format.
 *
 * @param {IMolContainer} molContainer  The molecule container.
 * @param {string} [separator=">"]  The separator to use.
 * @param {number} [maxLength=20]  Abbreviate to no longer than this length. If
 *                                 0 or less, don't abbreviate.
 * @param {IMolContainer[]} [allMols]  All the molecules.
 * @returns {string}  The name of the molecule in path-like format.
 */
export function nodePathName(
    molContainer: IMolContainer,
    separator = ">",
    maxLength = 20,
    allMols?: IMolContainer[]
): string {
    // If molecules not provided, get them from the store (all molecules).
    if (allMols === undefined) {
        allMols = getStoreVar("molecules") as IMolContainer[];
    }

    const ancestors = getNodeAncestory(molContainer, allMols);
    let titles = ancestors.map((x) => x.title);

    // Simplify words some
    let newTitle = "";
    if (maxLength > 0) {
        titles = titles.map((x) => {
            if (x === undefined) {
                return "";
            }
            return x
                .replace("Protein", "Prot")
                .replace("Compound", "Cmpd")
                .replace("Solvent", "Sol");
        });

        newTitle = titles.join(separator);
        while (titles.length > 3) {
            if (newTitle.length < maxLength) {
                break;
            }

            // remove any existing elements of value ...
            titles = titles.filter((x) => x !== "...");

            // Set middle element to ...
            let middle = Math.floor(titles.length / 2);
            if (middle === titles.length - 1) {
                middle--;
            }
            if (middle === 0) {
                middle++;
            }
            titles[middle] = "...";

            newTitle = titles.join(separator);
        }
        if (newTitle.length > maxLength) {
            newTitle = molContainer.title;
        }
    } else {
        // Not abbreviating
        newTitle = titles.join(separator);
    }

    return newTitle;
}

export interface IFilterMol {
    model?: boolean | undefined;
    shape?: boolean | undefined;
    selected?: boolean | SelectedType | undefined;
    visible?: boolean | undefined;
    type?: MolType | undefined;
    notId?: string | undefined;
    undefined?: boolean | undefined;
}

export function extractFlattenedContainers(
    molContainers: IMolContainer[],
    filter: IFilterMol
): IMolContainer[] {
    // First filter out models
    if (filter.model !== undefined) {
        // mol_filter_ok
        molContainers = molContainers.filter((molContainer) => {
            const hasModel = molContainer.model !== undefined;
            return hasModel === filter.model;
        });
    }

    // Then filter out shapes
    if (filter.shape !== undefined) {
        // mol_filter_ok
        molContainers = molContainers.filter((molContainer) => {
            const hasShape = molContainer.shape !== undefined;
            return hasShape === filter.shape;
        });
    }

    // Then filter out selected
    if (filter.selected !== undefined) {
        // Is boolean?
        if (typeof filter.selected === "boolean") {
            // mol_filter_ok
            molContainers = molContainers.filter((molContainer) => {
                const isSelected = molContainer.selected !== SelectedType.False;
                return isSelected === filter.selected;
            });
        } else {
            // Of type SelectedType
            // mol_filter_ok
            molContainers = molContainers.filter((molContainer) => {
                return molContainer.selected === filter.selected;
            });
        }
    }

    // Then filter out visible
    if (filter.visible !== undefined) {
        // mol_filter_ok
        molContainers = molContainers.filter((molContainer) => {
            const isVisible = molContainer.visible === true;
            return isVisible === filter.visible;
        });
    }

    if (filter.undefined !== undefined) {
        // mol_filter_ok
        molContainers = molContainers.filter((molContainer) => {
            const isUndefined = molContainer === undefined;
            return isUndefined === filter.undefined;
        });
    }

    // Then filter out type
    if (filter.type !== undefined) {
        // mol_filter_ok
        molContainers = molContainers.filter((molContainer) => {
            return molContainer.type === filter.type;
        });
    }

    if (filter.notId !== undefined) {
        // mol_filter_ok
        molContainers = molContainers.filter((molContainer) => {
            return molContainer.id !== filter.notId;
        });
    }

    return molContainers;
}

export function mergeMolContainers(
    molContainers: IMolContainer[],
    newName = "mergedMol"
): IMolContainer {
    const mergedMolContainer = molContainers[0];

    // Keep going through the nodes of each container and merge them into the
    // first container.
    for (let i = 1; i < molContainers.length; i++) {
        const molContainer = molContainers[i];

        // Get the terminal nodes
        const terminalNodes = getTerminalNodes([molContainer]);

        // Get ancestry of each terminal node
        for (const terminalNode of terminalNodes) {
            const ancestry = getNodeAncestory(terminalNode, [molContainer]);

            // Remove first one, which is the root node
            ancestry.shift();

            let mergedMolContainerPointer = mergedMolContainer;
            const mergedMolNodesTitles = mergedMolContainerPointer.nodes?.map(
                (node) => node.title
            ) as string[];

            while (mergedMolNodesTitles?.indexOf(ancestry[0].title) !== -1) {
                if (!mergedMolContainerPointer.nodes) {
                    // When does this happen?
                    debugger;
                    break;
                }

                // Update the pointer
                mergedMolContainerPointer =
                    mergedMolContainerPointer.nodes.find(
                        (node) => node.title === ancestry[0].title
                    ) as IMolContainer;

                // Remove the first node from the ancestry
                ancestry.shift();
            }

            // You've reached the place where the node should be added. First,
            // update its parentId.
            const nodeToAdd = ancestry[0];
            nodeToAdd.parentId = mergedMolContainerPointer.id;

            // And add it
            mergedMolContainerPointer.nodes?.push(nodeToAdd);
        }
    }

    mergedMolContainer.title = newName;

    return mergedMolContainer;
}
