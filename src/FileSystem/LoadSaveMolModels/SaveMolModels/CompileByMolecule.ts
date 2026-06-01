import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { getTerminalNodesToConsider } from "@/UI/Navigation/TreeView/TreeUtils";
import { IMolsToConsider, ICompiledNodes } from "./Types";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";

/**
 * Compile each top-level molecule's terminal nodes into receptor groups plus a
 * pooled compound list. Used by both the molecule-input gathering path and the
 * save path.
 *
 * @param {IMolsToConsider} molsToConsider  Which molecules to include.
 * @param {boolean} separateComponents  Split each molecule into component types
 *     rather than treating it as one undifferentiated group.
 * @param {boolean} [mergeProteinAssociatedCompounds=false]  When true, a
 *     molecule containing both protein and compound components folds its
 *     compounds (e.g., cofactors) into that molecule's receptor group instead
 *     of pooling them as standalone dockable compounds. Has no effect on
 *     molecules that lack a protein, so ligand-only molecules stay dockable.
 * @returns {ICompiledNodes}  The compiled grouping.
 */
export function compileByMolecule(
    molsToConsider: IMolsToConsider,
  separateComponents: boolean,
  mergeProteinAssociatedCompounds = false
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
      // Pre-scan so we know whether this molecule pairs a protein with
      // compounds before deciding where its compound nodes are routed.
      let hasProtein = false;
      let hasCompounds = false;
      terminalNodes.forEach((node) => {
        if (node.type === TreeNodeType.Protein) {
          hasProtein = true;
        } else if (node.type === TreeNodeType.Compound) {
          hasCompounds = true;
        }
      });
      const foldCompoundsIntoReceptor =
        mergeProteinAssociatedCompounds && hasProtein && hasCompounds;
            terminalNodes.forEach((node) => {
                const type = node.type || TreeNodeType.Other;
                if (!nodesByType.has(type)) {
                    nodesByType.set(type, new TreeNodeList());
                }
                nodesByType.get(type)?.push(node);

    // Legacy population
        if (type === TreeNodeType.Compound && !foldCompoundsIntoReceptor) {
     compoundsNodes.push(node);
    } else {
          // Non-compound components, and (when folding) the molecule's
          // compounds, all belong to this molecule's receptor group.
     nonCompoundNodesForThisMol.push(node);
    }
            });
      // byType stays keyed by true chemical type regardless of folding; only
      // the receptor grouping (nodeGroups/compoundsNodes) reflects the fold,
      // so existing byType consumers (e.g., save paths) are unaffected.
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
