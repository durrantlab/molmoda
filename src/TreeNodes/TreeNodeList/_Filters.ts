// Only called from TreeNodeList.
import { TreeNodeType, SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import type { TreeNode } from "../TreeNode/TreeNode";
import type { TreeNodeList } from "./TreeNodeList";
import {
 getTerminalsFromCache,
 setTerminalsInCache,
} from "../TreeCache";

// Naming convention:
// If you can pass something to invert the filter, start with "keep" or "remove".
// If you can't pass anything, start with "only".
// Use get if no parameters.

export type EasyCriterion = string | number | TreeNodeType;

/**
 * TreeNodeListFilters class
 */
export class TreeNodeListFilters {
    private parentTreeNodeList: TreeNodeList;

    // The findNode and other functions are very expensive, per profiler. Going
    // to try caching the results for a speedup.
    private cache = new Map<string, TreeNode>();

    /**
     * Creates an instance of TreeNodeListFilters.
     *
     * @param  {TreeNodeList} parentTreeNodeList  The parent TreeNodeList.
     */
    constructor(parentTreeNodeList: TreeNodeList) {
        this.parentTreeNodeList = parentTreeNodeList;
    }

    /**
     * Returns a flattened list (including all descendent nodes) if
     * deepAndFlatten is true. Otherwise, returns the parent TreeNodeList.
     *
     * @param  {boolean} [deepAndFlatten=false]  Whether to flatten the list.
     * @returns {TreeNodeList}  The flattened list, or the parent TreeNodeList.
     */
    private getFlattenedIfAppropriate(deepAndFlatten = false): TreeNodeList {
        return deepAndFlatten
            ? this.parentTreeNodeList.flattened
            : this.parentTreeNodeList;
    }

    /**
     * Returns a list of nodes that have (or do not have) models.
     *
     * @param  {boolean} [keepModel=true]        Whether to create a list of
     *                                           nodes that have models, or a
     *                                           list of nodes that don't have
     *                                           models.
     * @param  {boolean} [deepAndFlatten=false]  Whether to flatten the list and
     *                                           consider all descendent nodes.
     * @returns {TreeNodeList}  The list of nodes that have (or do not have)
     *     models.
     */
    public keepModels(keepModel = true, deepAndFlatten = false): TreeNodeList {
        const treeNodeList = this.getFlattenedIfAppropriate(deepAndFlatten);

        // mol_filter_ok
        return treeNodeList.filter((treeNode) => {
            const hasModel = treeNode.model !== undefined;
            return hasModel === keepModel;
        });
    }

    /**
     * Returns a list of nodes that have (or do not have) regions.
     *
     * @param  {boolean} [keepRegion=true]       Whether to create a list of
     *                                           nodes that have regions, or a
     *                                           list of nodes that don't have
     *                                           regions.
     * @param  {boolean} [deepAndFlatten=false]  Whether to flatten the list and
     *                                           consider all descendent nodes.
     * @returns {TreeNodeList}  The list of nodes that have (or do not have)
     *    regions.
     */
    public keepRegions(
        keepRegion = true,
        deepAndFlatten = false
    ): TreeNodeList {
        const treeNodeList = this.getFlattenedIfAppropriate(deepAndFlatten);

        // mol_filter_ok
        return treeNodeList.filter((treeNode) => {
            const hasRegion = treeNode.region !== undefined;
            return hasRegion === keepRegion;
        });
    }

    /**
     * Returns a list of nodes that are (or are not) selected.
     *
     * @param  {boolean|SelectedType} [keepSelected=true]     Whether to create
     *                                                        a list of nodes
     *                                                        that are selected,
     *                                                        or a list of nodes
     *                                                        that are not
     *                                                        selected. If a
     *                                                        SelectedType is
     *                                                        passed, only nodes
     *                                                        that are selected
     *                                                        with that
     *                                                        SelectedType will
     *                                                        be returned.
     * @param  {boolean}              [deepAndFlatten=false]  Whether to flatten
     *                                                        the list and
     *                                                        consider all
     *                                                        descendent nodes.
     * @returns {TreeNodeList}  The list of nodes that are (or are not)
     *     selected.
     */
    public keepSelected(
        keepSelected: boolean | SelectedType = true,
        deepAndFlatten = false
    ): TreeNodeList {
        const treeNodeList = this.getFlattenedIfAppropriate(deepAndFlatten);

        // mol_filter_ok
        // Is boolean?
        if (typeof keepSelected === "boolean") {
            // mol_filter_ok
            return treeNodeList.filter((treeNode) => {
                const isSelected = treeNode.selected !== SelectedType.False;
                return isSelected === keepSelected;
            });
        } else {
            // Of type SelectedType
            // mol_filter_ok
            return treeNodeList.filter((treeNode) => {
                return treeNode.selected === keepSelected;
            });
        }
    }

    /**
     * Returns a list of nodes that are (or are not) visible.
     *
     * @param  {boolean} [keepVisible=true]      Whether to create a list of
     *                                           nodes that are visible, or a
     *                                           list of nodes that are not
     *                                           visible.
     * @param  {boolean} [deepAndFlatten=false]  Whether to flatten the list and
     *                                           consider all descendent nodes.
     * @returns {TreeNodeList}  The list of nodes that are (or are not) visible.
     */
    public keepVisible(
        keepVisible = true,
        deepAndFlatten = false
    ): TreeNodeList {
        const treeNodeList = this.getFlattenedIfAppropriate(deepAndFlatten);

        // mol_filter_ok
        return treeNodeList.filter((treeNode) => {
            const isVisible = treeNode.visible === true;
            return isVisible === keepVisible;
        });
    }

    /**
     * Returns a list of nodes that are (or are not) undefined.
     *
     * @param  {boolean} [removeUndefined=true]  Whether to create a list of
     *                                           nodes that are NOT undefined,
     *                                           or a list of nodes that are
     *                                           undefined.
     * @param  {boolean} [deepAndFlatten=false]  Whether to flatten the list and
     *                                           consider all descendent nodes.
     * @returns {TreeNodeList}  The list of nodes that are (or are not)
     *     undefined.
     */
    public removeUndefined(
        removeUndefined = true,
        deepAndFlatten = false
    ): TreeNodeList {
        const treeNodeList = this.getFlattenedIfAppropriate(deepAndFlatten);

        // mol_filter_ok
        return treeNodeList.filter((treeNode) => {
            const isUndefined = treeNode === undefined;
            return isUndefined !== removeUndefined;
        });
    }

    /**
     * Returns a list of nodes that have (or do not have) a given type.
     *
     * @param  {TreeNodeType} type                    The type to filter by.
     * @param  {boolean} [deepAndFlatten=false]  Whether to flatten the list and
     *                                           consider all descendent nodes.
     * @returns {TreeNodeList}  The list of nodes that have (or do not have) a
     *     given type.
     */
    public keepType(type: TreeNodeType, deepAndFlatten = false): TreeNodeList {
        const treeNodeList = this.getFlattenedIfAppropriate(deepAndFlatten);

        // mol_filter_ok
        return treeNodeList.filter((treeNode) => {
            return treeNode.type === type;
        });
    }

    /**
     * Returns a list of nodes that do not have a given id. Good for removing a
     * specific node from the list.
     *
     * @param  {string}  id                      The id to filter by.
     * @param  {boolean} [deepAndFlatten=false]  Whether to flatten the list and
     *                                           consider all descendent nodes.
     * @returns {TreeNodeList}  The list of nodes that do not have a given id.
     */
    public removeId(id: string, deepAndFlatten = false): TreeNodeList {
        const treeNodeList = this.getFlattenedIfAppropriate(deepAndFlatten);

        // mol_filter_ok
        return treeNodeList.filter((treeNode) => {
            return treeNode.id !== id;
        });
    }

    /**
     * Given a list of TreeNode, returns only those with unique ids.
     *
     * @returns {TreeNodeList} The filtered list.
     */
    public get onlyUnique(): TreeNodeList {
        // mol_filter_ok
        return this.parentTreeNodeList.filter(
            (node, index, self) =>
                index === self.findIndex((t: TreeNode) => t.id === node.id)
        );
    }

    /**
     * A recursive function to find the node of id.
     *
     * @param  {TreeNodeList} mls  The array of TreeNode to search.
     * @param  {string}          i    The id of the node to find.
     * @returns {TreeNode | null}  The node with the given id, or null if
     *                                  not.
     */
    private findNode(mls: TreeNodeList, i: string): TreeNode | null {
        // Caching result for speed.
        if (this.cache.has(i)) {
            return this.cache.get(i) as TreeNode;
        }

        const { _nodes } = mls;

        // Calculate only once for speed. Not using length property for
        // speed.
        const mlsLength = _nodes.length;

        // Use while loop because might be faster.
        let idx = 0;
        while (idx < mlsLength) {
            // Generally good to use .get() instead of [], but this function
            // is a bottle neck, so access array directly.
            const mol = _nodes[idx];

            if (mol.id === i) {
                this.cache.set(i, mol);
                return mol;
            }
            if (mol.nodes) {
                const node = this.findNode(mol.nodes, i);
                if (node !== null) {
                    this.cache.set(i, node);
                    return node;
                }
            }
            idx++;
        }
        return null;
    }

    /**
     * Find a node with a given id.
     *
     * @param  {string}          id    The id of the node to find.
     * @returns {TreeNode | null}  The node with the given id, or null if not
     *     found.
     */
    public onlyId(id: string): TreeNode | null {
        if (this.cache.get(id)) {
            return this.cache.get(id) as TreeNode;
        }
        return this.findNode(this.parentTreeNodeList, id);
    }

    /**
     * Get the nodes with the given ids. If a node has sub-nodes, keep those with
     * matching ids too.
     *
     * @param  {string[]} ids  The ids of the nodes to keep.
     * @returns {TreeNodeList}  The list of nodes with the given ids.
     */
    public onlyIdsDeep(ids: string[]): TreeNodeList {
        // Keep only the ones in this list with matching ids.
        const filteredCopy = this.parentTreeNodeList.filter((mol: TreeNode) => {
            if (!mol.id) {
                return false;
            }
            return ids.includes(mol.id);
        });

        // If any of the nodes have sub-nodes, keep those with matching ids too.
        filteredCopy.forEach((mol: TreeNode) => {
            if (mol.nodes) {
                mol.nodes = mol.nodes.filters.onlyIdsDeep(ids);
            }
        });

        return filteredCopy;
    }

    /**
     * Get all the nodes that are terminal (have a model, not sub-molecules).
     *
     * @returns {TreeNodeList}  The array of terminal nodes.
     */
    public get onlyTerminal(): TreeNodeList {
  const cached = getTerminalsFromCache(this.parentTreeNodeList);
  if (cached) {
   return cached;
        }
        /**
         * A recursive function to find the terminal leaves of mols.
         *
         * @param  {TreeNodeList} mls  The array of TreeNode to search.
         * @returns {TreeNodeList}  The array of terminal nodes (leaves).
         */
        const findLeaves = (mls: TreeNodeList): TreeNodeList => {
            // Below is to avoid a circular dependency.
            const leaves = mls.newTreeNodeList();

            mls.forEach((mol: TreeNode) => {
                if (mol.nodes) {
                    leaves.extend(findLeaves(mol.nodes));
                } else {
                    leaves.push(mol);
                }
            });
            return leaves;
        };
        const result = findLeaves(this.parentTreeNodeList);
  setTerminalsInCache(this.parentTreeNodeList, result);
        return result;
    }

    /**
     * An easy way to look up nodes in the descendency. Can be a list of
     * criteria (one criteria per level) or a single criteria.
     *
     * @param  {EasyCriterion[]|EasyCriterion} searchCriteria  The criteria.
     * @returns {TreeNodeList}  The nodes that match the criteria.
     */
    public lookup(
        searchCriteria: EasyCriterion[] | EasyCriterion
    ): TreeNodeList {
        // If EasyCriterion is not an array, make it one.
        if (!Array.isArray(searchCriteria)) {
            searchCriteria = [searchCriteria];
        }

        const hits = this.parentTreeNodeList.newTreeNodeList();
        const { newTreeNodeList } = this.parentTreeNodeList;
        const recurse = (
            searchCrit: EasyCriterion[],
            treeNodeList: TreeNodeList
        ) => {
            const firstCriterion = searchCrit.shift();

            let treeNodesToConsider: TreeNodeList;

            if (typeof firstCriterion === "number") {
                // Process the nth.
                treeNodesToConsider = newTreeNodeList([
                    treeNodeList.get(firstCriterion as number),
                ]);
            } else {
                // Assuming it's a string. Could match a lot of things.
                treeNodesToConsider = treeNodeList.filter(
                    (treeNode: TreeNode) => {
                        if (firstCriterion === "*") {
                            // Doesn't seem to wokr
                            return true;
                        }
                        if (treeNode.id === firstCriterion) {
                            return true;
                        }
                        if (treeNode.title === firstCriterion) {
                            return true;
                        }
                        return treeNode.type === firstCriterion;
                    }
                );
            }

            if (searchCrit.length > 0) {
                treeNodesToConsider.forEach((treeNode: TreeNode) => {
                    if (treeNode.nodes) {
                        recurse(searchCrit, treeNode.nodes);
                    }
                });
            } else {
                hits.extend(treeNodesToConsider);
            }
        };

        recurse(searchCriteria, this.parentTreeNodeList);
        return hits;
    }
}
