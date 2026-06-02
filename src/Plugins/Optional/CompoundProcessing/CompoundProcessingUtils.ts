import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { parseAndLoadMoleculeFile } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import { loadHierarchicallyFromTreeNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import { ILoadMolParams } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/Types";

/**
 * Converts an array of molecular text strings back into compound TreeNodes,
 * matching each result to its original compound's title. This pattern is
 * shared by ProtonateCompoundsPlugin and Regen3DCoordsPlugin.
 *
 * @param {string[]}   molTexts     The converted molecular text for each compound.
 * @param {FileInfo[]} compounds    The original compound FileInfo objects
 *                                  (with treeNode and title metadata).
 * @param {string}     tag          The plugin ID tag for tree membership.
 * @param {string}     groupTitle   The title for the hierarchical root node
 *                                  (e.g., "Compounds:protonated").
 * @param {Partial<ILoadMolParams>} [extraParams]  Additional params passed to
 *                                  parseAndLoadMoleculeFile (e.g., desalt, gen3D).
 * @returns {Promise<TreeNode>}  The root TreeNode containing all processed compounds.
 */
export async function convertMolTextsToCompoundTree(
    molTexts: string[],
    compounds: FileInfo[],
    tag: string,
    groupTitle: string,
    extraParams: Partial<ILoadMolParams> = {}
): Promise<TreeNode> {
    const treeNodePromises: Promise<void | TreeNodeList>[] = [];
    for (let i = 0; i < molTexts.length; i++) {
        const fileInfo = new FileInfo({
            name: compounds[i].name,
            contents: molTexts[i],
            auxData: compounds[i].treeNode?.title,
        });
        const promise = parseAndLoadMoleculeFile({
            fileInfo,
            tag,
            addToTree: false,
            ...extraParams,
        });
        treeNodePromises.push(promise);
    }

    const treeNodeLists = (await Promise.all(
        treeNodePromises
    )) as (void | TreeNodeList)[];
    // Pair each parse result with its source compound by index *before*
    // filtering. The promises are index-aligned with `compounds`, but a bare
    // `.filter(undefined)` would shift that alignment whenever a parse yields
    // nothing. Restoring the user's title by index (rather than by matching the
    // freshly parsed title) is what makes renames survive: after the OpenBabel
    // round-trip the parsed title reflects the converted file's name, which no
    // longer equals a user-renamed title, so the old value-match silently
    // failed and reverted to the original name.
    const onlyTreeNodes = treeNodeLists
        .map((tl, i) => ({ tl, compound: compounds[i] }))
        .filter(
            (entry): entry is { tl: TreeNodeList; compound: FileInfo } =>
                entry.tl !== undefined
        )
        .map(({ tl, compound }) => {
            let node = tl.get(0);
            if (node.nodes) {
                // Extract the terminal compound node from the container.
                node = node.nodes.terminals.get(0);
            }
            node.type = TreeNodeType.Compound;
            if (compound && compound.treeNode !== undefined) {
                node.title = compound.treeNode.title;
            }
            return node;
        });

    return loadHierarchicallyFromTreeNodes(onlyTreeNodes, groupTitle);
}