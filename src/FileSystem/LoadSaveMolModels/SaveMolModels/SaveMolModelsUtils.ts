import { IAtom, TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import * as api from "@/Api";
import { getFormatInfoGivenType, IFormatInfo } from "../Types/MolFormats";
import { getFileNameParts } from "@/FileSystem/FilenameManipulation";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { makeEasyParser } from "../ParseMolModels/EasyParser";
import { slugify, capitalize } from "@/Core/Utils/StringUtils";

/**
 * Finds terminal nodes, and separates them into compounds and non-compounds.
 * (Kept for backward compatibility or specific plugins, though compileByMolecule is preferred now)
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
 * Includes naming logic based on component type.
 *
 * @param  {TreeNodeList} nodes    The molecules.
 * @param  {string}   targetExt   The target extension (format).
 * @param  {boolean}  merge    Whether to merge all molecules into one.
 * @param  {TreeNodeType} [type] The component type (for naming).
 * @returns {Promise<FileInfo[]>}  A promise that resolves to a list of FileInfo.
 */
export function getConvertedTxtsWithNaming(
    nodes: TreeNodeList,
    targetExt: string,
    merge: boolean,
    type?: TreeNodeType
): Promise<FileInfo[]> {
    // Remove regions from nodes. These can never be converted.
    const ext = getPrimaryExt(targetExt);
    nodes = nodes.filters.keepRegions(false);

    // If no nodes left, nothing to convert.
    if (nodes.length === 0) {
        return Promise.resolve([]);
    }


    return nodes
        .toFileInfos(ext, merge)
        .then((molFileInfos: FileInfo[]) => {
            return molFileInfos.map((molFileInfo, idx) => {
                // Prepend the chain
                const molEntry = nodes.get(idx);
                molFileInfo.name = getFilename(molEntry, ext, type);
                molFileInfo.treeNode = molEntry;
                return molFileInfo;
            });
        });
}

/**
 * Backwards compatibility wrapper
 *
 * @param  {TreeNodeList} nodes    The molecules.
 * @param  {string}   targetExt   The target extension (format).
 * @param  {boolean}  merge    Whether to merge all molecules into one.
 * @param  {string}   [filename]  The fileame to use. Will be generated if not given.
 * @returns {Promise<FileInfo[]>}  A promise that resolves to a list of FileInfo containing the texts for saving.
 */
export function getConvertedTxts(
    nodes: TreeNodeList,
    targetExt: string,
    merge: boolean,
    filename?: string
): Promise<FileInfo[]> {
    const ext = getPrimaryExt(targetExt);
    nodes = nodes.filters.keepRegions(false);
    if (nodes.length === 0) return Promise.resolve([]);
    return nodes.toFileInfos(ext, merge).then((molFileInfos) => {
        return molFileInfos.map((molFileInfo, idx) => {
            molFileInfo.name = filename ? `${filename}.${ext}` : getFilename(nodes.get(idx), ext);
            molFileInfo.treeNode = nodes.get(idx);
            return molFileInfo;
        });
    });
}

export function getPrimaryExt(format: string): string {
    const formatInfo = getFormatInfoGivenType(format) as IFormatInfo;
    return formatInfo ? formatInfo.primaryExt : format;
}

/**
 * Get a filename appropriate for a given node (molecule).
 *
 * @param {TreeNode} treeNode  The molecule.
 * @param {string} ext  The extension to use.
 * @returns {string} The filename.
 */
function getFilename(treeNode: TreeNode, ext: string, type?: TreeNodeType): string {
    let txtPrts = [getFileNameParts(treeNode.src as string).basename];

    // If it's a compound, try to be specific
    if (treeNode.type === TreeNodeType.Compound) {
        const easyMol = makeEasyParser(treeNode.model);
        const firstAtom: IAtom = easyMol.getAtom(0);
        const resn = firstAtom.resn ? firstAtom.resn.trim() : "";
        const resi = firstAtom.resi ? firstAtom.resi.toString().trim() : "";
        if (resn) txtPrts.push(resn);
        if (resi) txtPrts.push(resi);
    }

    const easyMol = makeEasyParser(treeNode.model);
    const firstAtom: IAtom = easyMol.getAtom(0);
    const chain = firstAtom.chain ? firstAtom.chain.trim() : "";
    if (chain && chain !== " ") txtPrts.push(chain);

    // Append type if meaningful and not "Other" or "Compound" (already handled)
    if (type && type !== TreeNodeType.Other && type !== TreeNodeType.Compound) {
        txtPrts.push(capitalize(type));
    } else if (type === TreeNodeType.Other) {
        // If we merged distinct things into "Other", maybe don't append anything or append "merged"
        // But usually src basename is enough.
    }

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
        // If we have a specific name for a single file, use it?
        // Or use the generated name? 
        // Current logic: If 1 file, save directly.
        // We might want to override the generated name with the user-provided filename 
        // if it makes sense.
        // However, the user provided "filename" usually implies the "Project Name".
        // If I save 1 protein, and name it "MyProject", I get "MyProject.zip" if multiple,
        // or "MyProject.pdb" if single.
        // But here files[0].name is already set to something like "1XDN-Protein.pdb".
        // The logic in the plugin passes `filename` as `compressedName`.

        // If the user provided a specific extension in the input, we might want to respect that.
        // But here `files[0]` has an extension derived from format.

        // Let's rely on the file's internal name but maybe use the user's filename 
        // if it matches the extension.

        const userExt = getFileNameParts(compressedName).ext;
        const fileExt = getFileNameParts(files[0].name).ext;

        if (userExt && userExt.toLowerCase() === fileExt.toLowerCase()) {
            files[0].name = compressedName;
        } else if (!userExt) {
            // If user didn't provide extension, use their name + correct extension
            files[0].name = compressedName + "." + fileExt;
        }

        return api.fs.saveTxt(files[0]);
    }
    if (!compressedName.toLowerCase().endsWith(".zip")) {
        compressedName += ".zip";
    }

    return api.fs.saveZipWithTxtFiles(compressedName, files);
}
