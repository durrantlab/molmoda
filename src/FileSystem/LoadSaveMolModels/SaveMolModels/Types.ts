import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

export interface IMolsToConsider {
    hiddenAndUnselected?: boolean;
    visible?: boolean;
    selected?: boolean;
}

export interface ICompiledNodes {
    // Non-compound nodes could be grouped by molecule. If not, will be a list
    // of only one item.
    nodeGroups: TreeNodeList[];

    // Compound nodes, if given, will always be per compound.
    compoundsNodes?: TreeNodeList;
}

export interface ICmpdNonCmpdFileInfos {
    compoundFileInfos: FileInfo[];
    nonCompoundFileInfos: FileInfo[];
}