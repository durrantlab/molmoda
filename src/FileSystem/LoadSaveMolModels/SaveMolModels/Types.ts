import { FileInfo } from "@/FileSystem/FileInfo";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";

export interface IMolsToConsider {
    hiddenAndUnselected?: boolean;
    visible?: boolean;
    selected?: boolean;
}

export interface ICompiledNodes {
    // Non-compound nodes could be grouped by molecule. If not, will be a list
    // of only one item.
    nodeGroups: IMolContainer[][];

    // Compound nodes, if given, will always be per compound.
    compoundsNodes?: IMolContainer[];
}

export interface ICmpdNonCmpdFileInfos {
    compoundFileInfos: FileInfo[];
    nonCompoundFileInfos: FileInfo[];
}