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

    const onlyTreeNodes = treeNodeLists
        .filter((tl): tl is TreeNodeList => tl !== undefined)
        .map((tl) => {
            let node = tl.get(0);
            if (node.nodes) {
                // Extract the terminal compound node from the container.
                node = node.nodes.terminals.get(0);
            }
            node.type = TreeNodeType.Compound;
            const compound = compounds.find((c) => c.auxData === node?.title);
            if (compound && compound.treeNode !== undefined) {
                node.title = compound.treeNode.title;
            }
            return node;
        });

    return loadHierarchicallyFromTreeNodes(onlyTreeNodes, groupTitle);
}