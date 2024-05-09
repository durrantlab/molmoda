import { IAtom, TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import * as api from "@/Api";
import { getFormatInfoGivenType, IFormatInfo } from "../Types/MolFormats";
import { getFileNameParts } from "@/FileSystem/FilenameManipulation";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { makeEasyParser } from "../ParseMolModels/EasyParser";
import { slugify } from "@/Core/Utils/StringUtils";

/**
 * Finds terminal nodes, and separates them into compounds and non-compounds.
 *
 * @param  {TreeNodeList} treeNodeList  All compounds.
 * @returns {any}  The terminal nodes, separated into
 *     compounds and non-compounds.
 */
export function separateCompoundNonCompoundTerminalNodes(
    treeNodeList: TreeNodeList
): { [key: string]: TreeNodeList } {
    let terminalNodes = treeNodeList.filters.onlyTerminal;

    // Keep only terminal nodes with unique ids
    terminalNodes = terminalNodes.filters.onlyUnique;

    const compoundNodes = terminalNodes.filters.keepType(TreeNodeType.Compound);
    // TODO: Do keepAllButType
    const nonCompoundNodes = terminalNodes.filter(
        (node: TreeNode) => node.type !== TreeNodeType.Compound
    );
    return { compoundNodes, nonCompoundNodes };
}

/**
 * Given a list of molecules, collect text for saving.
 *
 * @param  {TreeNodeList} nodes       The molecules.
 * @param  {string}   targetExt   The target extension (format).
 * @param  {boolean}  merge       Whether to merge all molecules into one.
 * @param  {string}   [filename]  The fileame to use. Will be generated if not
 *                                       given.
 * @returns {Promise<FileInfo[]>}  A promise that resolves to a list of FileInfo
 *     containing the texts for saving.
 */
export function getConvertedTxts(
    nodes: TreeNodeList,
    targetExt: string,
    merge: boolean,
    filename?: string
): Promise<FileInfo[]> {
    // Remove regions from nodes. These can never be converted.
    nodes = nodes.filters.keepRegions(false);

    // If no nodes left, nothing to convert.
    if (nodes.length === 0) {
        return Promise.resolve([]);
    }


    return nodes
        .toFileInfos(targetExt, merge)
        .then((molFileInfos: FileInfo[]) => {
            return molFileInfos.map((molFileInfo, idx) => {
                // Prepend the chain
                const molEntry = nodes.get(idx);

                // molFileInfo is pretty incomplete. Update some of the values.
                molFileInfo.name =
                    filename === undefined
                        ? getFilename(molEntry, targetExt)
                        : `${filename}.${targetExt}`;
                molFileInfo.treeNode = molEntry;
                return molFileInfo;
            });
        });
}

/**
 * Gets a primary extension given an input extension. (So, for example, maps
 * "ent" to "pdb".)
 *
 * @param  {string} format  The input format.
 * @returns {string}  The primary extension.
 */
export function getPrimaryExt(format: string): string {
    const formatInfo = getFormatInfoGivenType(format) as IFormatInfo;
    return formatInfo.primaryExt;
}

/**
 * Get a filename appropriate for a given node (molecule).
 *
 * @param {TreeNode} treeNode  The molecule.
 * @param {string} ext  The extension to use.
 * @returns {string} The filename.
 */
function getFilename(treeNode: TreeNode, ext: string): string {
    let txtPrts = [getFileNameParts(treeNode.src as string).basename];

    const easyMol = makeEasyParser(treeNode.model);
    const firstAtom: IAtom = easyMol.parseAtom(0);

    if (treeNode.type === TreeNodeType.Compound) {
        const resn = firstAtom.resn ? firstAtom.resn.trim() : "";
        const resi = firstAtom.resi ? firstAtom.resi.toString().trim() : "";
        txtPrts.push(resn);
        txtPrts.push(resi);
    }

    const chain = firstAtom.chain ? firstAtom.chain.trim() : "";
    txtPrts.push(chain);
    txtPrts.push(treeNode.type as string);

    // remove undefined or ""
    txtPrts = txtPrts.filter((x) => x);

    return slugify(txtPrts.join("-"), false) + "." + ext;
}

/**
 * Given a list of IFileInfo objects (e.g., from getSaveTxtPromises), save them
 * to the disk. Compress if necessary.
 *
 * @param  {FileInfo[]} files     The files to save.
 * @param  {string}     compressedName  The filename to use.
 * @returns {Promise<any>}  A promise that resolves when the files are saved.
 */
export function saveTxtFiles(
    files: FileInfo[],
    compressedName: string
): Promise<any> {
    if (files.length === 1) {
        // Only one file. Save it directly. Name of file should be filename.ext
        // (otherwise that would be name of zip file).
        // files[0].name = zipFilename + files[0].ext;
        return api.fs.saveTxt(files[0]);
    }

    // If compressed name does not end in ".zip", add it.
    if (!compressedName.toLowerCase().endsWith(".zip")) {
        compressedName += ".zip";
    }

    return api.fs.saveZipWithTxtFiles(compressedName, files);
}
