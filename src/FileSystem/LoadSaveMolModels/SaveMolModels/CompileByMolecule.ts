import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { getTerminalNodesToConsider } from "@/UI/Navigation/TreeView/TreeUtils";
import { IMolsToConsider, ICompiledNodes } from "./Types";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";

/**
 * Runs the job when the user wants to save in a non-molmoda format, by
 * molecule.
 *
 * @param {IMolsToConsider} molsToConsider   The molecules to save.
 * @param {boolean}   separateComponents     Whether to separate components into different files.
 * @returns {ICompiledNodes}  The compiled nodes organized by type and grouping.
 */
export function compileByMolecule(
    molsToConsider: IMolsToConsider,
    separateComponents: boolean
): ICompiledNodes {
    // Not using molmoda format. Create ZIP file with protein and small
    // molecules.
    const byType = new Map<TreeNodeType, TreeNodeList[]>();
 const nodeGroups: TreeNodeList[] = [];
 const compoundsNodes = new TreeNodeList();

    getMoleculesFromStore().forEach((topLevelNode) => {
        // Get all descendants for this molecule
        const allNodes = new TreeNodeList([topLevelNode]);
        if (topLevelNode.nodes) {
            allNodes.extend(topLevelNode.nodes);
        }

        // Filter based on user selection (visible, selected, etc.)
        let terminalNodes = getTerminalNodesToConsider(
            molsToConsider,
            allNodes
        );

        // Remove undefineds, regions
        terminalNodes = terminalNodes.filters.removeUndefined();
        terminalNodes = terminalNodes.filters.keepRegions(false);

        if (terminalNodes.length === 0) return;

        if (separateComponents) {
            // Group by type
            const nodesByType = new Map<TreeNodeType, TreeNodeList>();
   // Helper lists for legacy output
   const nonCompoundNodesForThisMol = new TreeNodeList();

            terminalNodes.forEach((node) => {
                const type = node.type || TreeNodeType.Other;
                if (!nodesByType.has(type)) {
                    nodesByType.set(type, new TreeNodeList());
                }
                nodesByType.get(type)?.push(node);

    // Legacy population
    if (type === TreeNodeType.Compound) {
     compoundsNodes.push(node);
    } else {
     nonCompoundNodesForThisMol.push(node);
    }
            });

   // Process each type for byType map
            nodesByType.forEach((nodes, type) => {
                if (!byType.has(type)) {
                    byType.set(type, []);
                }

                // Compounds are always saved individually (one file per compound)
                if (type === TreeNodeType.Compound) {
                    nodes.forEach((node) => {
                        byType.get(type)?.push(new TreeNodeList([node]));
                    });
                } else {
                    // Other components (Protein, Nucleic, Metal, etc.) are grouped per top-level molecule.
                    // So all chains of Protein A go into one file.
                    byType.get(type)?.push(nodes);
                }
            });

   // Legacy: Add non-compound nodes group
   if (nonCompoundNodesForThisMol.length > 0) {
    nodeGroups.push(nonCompoundNodesForThisMol);
   }

        } else {
   // Lump everything for this molecule into one group under 'Other' (or mix)
            if (!byType.has(TreeNodeType.Other)) {
                byType.set(TreeNodeType.Other, []);
            }
            byType.get(TreeNodeType.Other)?.push(terminalNodes);

   // For legacy compatibility, if we aren't separating, we treat everything as a "non-compound" group usually,
   // or we separate compounds if they exist?
   // Original behavior for !keepCompoundsSeparate was grouping everything into nodeGroups.
   // But usually keepCompoundsSeparate passed to compileByMolecule was true in the calling code of compileMolModels.
   // In compileMolModels (original), if !keepCompoundsSeparate, it grouped everything.
   // Here, if separateComponents is false, we put everything in nodeGroups.
   nodeGroups.push(terminalNodes);
        }
    });

 return { byType, nodeGroups, compoundsNodes };
}
