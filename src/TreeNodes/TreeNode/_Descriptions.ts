import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import type { TreeNodeList } from "../TreeNodeList/TreeNodeList";
import type { TreeNode } from "./TreeNode";

/**
 * TreeNodeDescriptions class
 */
export class TreeNodeDescriptions {
    private parentTreeNode: TreeNode;

    /**
     * Constructor.
     *
     * @param  {TreeNode} parentTreeNode The parent TreeNode.
     */
    constructor(parentTreeNode: TreeNode) {
        this.parentTreeNode = parentTreeNode;
    }

    /**
     * Gets a description of a molecule. Useful when you want to refer to a
     * molecule in text (not the heirarchical tree). If slugified, could be used
     * as a filename. TODO: Not currently used. Use pathName instead.
     *
     * @param  {TreeNode}      mol                 The molecule to describe.
     * @param  {TreeNodeList}  treeNodeList        The list of all molecules.
     * @param  {boolean}       [noCategory=false]  Whether to include the
     *                                             category component of the
     *                                             description ("protein",
     *                                             "compound", "metal", etc.).
     * @returns {string}  The description.
     */
    // public getMolDescription(
    //     mol: TreeNode,
    //     treeNodeList: TreeNodeList,
    //     noCategory = false
    // ): string {
    //     // If it has no parent, just return it's title.
    //     let curMol: TreeNode | null = mol;
    //     const titles = [getFileNameParts(curMol.title as string).basename];

    //     while (curMol.parentId) {
    //         curMol = treeNodeList.filters.onlyId(curMol.parentId);
    //         if (curMol) {
    //             // Add to top of list
    //             titles.unshift(
    //                 getFileNameParts(curMol.title as string).basename
    //             );
    //             continue;
    //         }
    //         break;
    //     }

    //     if (noCategory && (titles.length > 2 || titles[1] === "Protein")) {
    //         // Remove one in position 1 ("protein", "compound", "metal", etc.)
    //         titles.splice(1, 1);
    //     }

    //     return titles.join(":").split("(")[0].trim();
    // }

    /**
     * Gets the name of the molecule in path-like format.
     *
     * @param {string}        [separator=">"]   The separator to use.
     * @param {number}        [maxLength=20]    Abbreviate to no longer than
     *                                          this length. If 0 or less, don't
     *                                          abbreviate.
     * @param {TreeNodeList}  [molsToConsider]  The molecules to consider when
     *                                          determining the path. If not
     *                                          specified, uses all molecules
     *                                          (default).
     * @returns {string}  The name of the molecule in path-like format.
     */
    public pathName(
        separator = ">",
        maxLength = 20,
        molsToConsider?: TreeNodeList
    ): string {
        // If molecules not provided, get them from the store (all molecules).
        if (molsToConsider === undefined) {
            molsToConsider = getMoleculesFromStore();
        }

        const ancestors = this.parentTreeNode.getAncestry(molsToConsider);
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
                    .replace("Solvent", "Solv")
                    .replace("protein", "prot")
                    .replace("compound", "cmpd")
                    .replace("solvent", "solv");
            });

            newTitle = titles.join(separator);
            while (titles.length > 3) {
                if (newTitle.length < maxLength) {
                    break;
                }

                // remove any existing elements of value ...
                titles = titles.filter((x) => x !== "");

                // Set middle element to ...
                let middle = Math.floor(titles.length / 2);
                if (middle === titles.length - 1) {
                    middle--;
                }
                if (middle === 0) {
                    middle++;
                }
                titles[middle] = "";

                newTitle = titles.join(separator);
            }
            if (newTitle.length > maxLength && this.parentTreeNode.title) {
                newTitle = this.parentTreeNode.title;
            }
        } else {
            // Not abbreviating
            newTitle = titles.join(separator);
        }

        return newTitle;
    }
}
