import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";

export interface IMolsToConsider {
    hiddenAndUnselected?: boolean;
    visible?: boolean;
    selected?: boolean;
}

export interface ICompiledNodes {
 // Map of component type to a list of node groups.
 // Each node group represents one file to be saved.
 // e.g. Protein -> [[Mol1_ChainA, Mol1_ChainB], [Mol2_ChainA]]
 // e.g. Compound -> [[Cmpd1], [Cmpd2]]
 byType: Map<TreeNodeType, TreeNodeList[]>;
 
 // Legacy properties to maintain compatibility with other plugins (e.g. MoleculeInput)
 // Non-compound nodes grouped by molecule
 nodeGroups: TreeNodeList[];
 // Compound nodes (all compounds in one list usually, or per compound)
 compoundsNodes?: TreeNodeList;
}

export interface ICmpdNonCmpdFileInfos {
 // Flattened list of all files to save
 allFileInfos: FileInfo[];
 // Legacy properties
 compoundFileInfos: FileInfo[];
 nonCompoundFileInfos: FileInfo[];
}