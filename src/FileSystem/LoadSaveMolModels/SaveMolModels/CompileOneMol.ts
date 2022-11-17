import { IFileInfo } from "@/FileSystem/Types";
import { getStoreVar } from "@/Store/StoreExternalAccess";
import { getTerminalNodesToConsider } from "@/UI/Forms/MoleculeInputParams/WhichMols";
import { IMolContainer, MolType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import { ICompiledNodes, IMolsToConsider } from "./SaveMolModels";
import { getPrimaryExt, getConvertedTxts, saveTxtFiles } from "./Utils";

/**
 * Runs the job when the user wants to save in a non-biotite format, all
 * molecules together.
 *
 * @param {IMolsToConsider} molsToConsider  The molecules to save.
 * @returns {IMolContainer[][]>}  A promise that resolves when the job is done
 *     with all the files.
 */
export function compileOneMol(molsToConsider: IMolsToConsider, keepCompoundsSeparate: boolean): ICompiledNodes {
    // Not using biotite format. Create ZIP file with protein and small
    // molecules.
    const mols = getStoreVar("molecules");

    const terminalNodes = getTerminalNodes(mols);

    let terminalNodesToConsider = getTerminalNodesToConsider(molsToConsider, terminalNodes)

    let compoundNodes: IMolContainer[] = [];
    if (keepCompoundsSeparate) {
        compoundNodes = terminalNodesToConsider.filter((node) => node.type === MolType.Compound);
        terminalNodesToConsider = terminalNodesToConsider.filter((node) => node.type !== MolType.Compound);
    }

    return {
        nodeGroups: [terminalNodesToConsider],
        compoundsNodes: compoundNodes,
    } as ICompiledNodes;
}
