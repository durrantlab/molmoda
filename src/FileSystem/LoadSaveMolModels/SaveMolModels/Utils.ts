import { slugify } from "@/Core/Utils";
import {
    IAtom,
    IMolContainer,
    MolType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { convertMolContainers } from "../ConvertMolModels/ConvertMolContainer";
import * as api from "@/Api";
import {
    getTerminalNodes,
    keepUniqueMolContainers,
} from "@/UI/Navigation/TreeView/TreeUtils";
import { getFormatInfoGivenType, IFormatInfo } from "../Types/MolFormats";
import { getFileNameParts } from "@/FileSystem/FilenameManipulation";
import { IFileInfo } from "@/FileSystem/Types";

/**
 * Finds terminal nodes, and separates them into compounds and non-compounds.
 *
 * @param  {IMolContainer[]} molContainers  All compounds.
 * @returns {any}  The terminal nodes, separated into
 *     compounds and non-compounds.
 */
export function separateCompoundNonCompoundTerminalNodes(
    molContainers: IMolContainer[]
): { [key: string]: IMolContainer[] } {
    let terminalNodes = getTerminalNodes(molContainers);

    // Keep only terminal nodes with unique ids
    terminalNodes = keepUniqueMolContainers(terminalNodes);

    const compoundNodes = terminalNodes.filter(
        (node) => node.type === MolType.Compound
    );
    const nonCompoundNodes = terminalNodes.filter(
        (node) => node.type !== MolType.Compound
    );
    return { compoundNodes, nonCompoundNodes };
}

/**
 * Given a list of molecules, collect text for saving.
 *
 * @param  {IMolContainer[]} nodes       The molecules.
 * @param  {string}          targetExt   The target extension (format).
 * @param  {boolean}         merge       Whether to merge all molecules into
 *                                       one.
 * @param  {string}          [filename]  The fileame to use. Will be generated
 *                                       if not given.
 * @returns {Promise<IFileInfo[]>}  A promise that resolves to a list of IFileInfo
 *     containing the texts for saving.
 */
export function getConvertedTxts(
    nodes: IMolContainer[],
    targetExt: string,
    merge: boolean,
    filename?: string
): Promise<IFileInfo[]> {
    return convertMolContainers(nodes, targetExt, merge).then(
        (molTxts: string[]) => {
            return molTxts.map((txt, idx) => {
                // Prepend the chain
                const molEntry = nodes[idx] as IMolContainer;

                return {
                    name:
                        filename === undefined
                            ? getFilename(molEntry, targetExt)
                            : `${filename}.${targetExt}`,
                    contents: txt,
                } as IFileInfo;
            });
        }
    );
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
 * @param {IMolContainer} molContainer  The molecule.
 * @param {string} ext  The extension to use.
 * @returns {string} The filename.
 */
function getFilename(molContainer: IMolContainer, ext: string): string {
    let txtPrts = [getFileNameParts(molContainer.src as string).basename];
    const firstAtom: IAtom = (molContainer.model as any).selectedAtoms({})[0];
    if (molContainer.type === MolType.Compound) {
        txtPrts.push(firstAtom.resn.trim());
        txtPrts.push(firstAtom.resi.toString().trim());
    }

    txtPrts.push(firstAtom.chain.trim());
    txtPrts.push(molContainer.type as string);

    // remove undefined or ""
    txtPrts = txtPrts.filter((x) => x);

    return slugify(txtPrts.join("-"), false) + "." + ext;
}

/**
 * Given a list of IFileInfo objects (e.g., from getSaveTxtPromises), save them
 * to the disk. Compress if necessary.
 *
 * @param  {IFileInfo[]} files     The files to save.
 * @param  {string}     compressedName  The filename to use.
 * @returns {Promise<any>}  A promise that resolves when the files are saved.
 */
export function saveTxtFiles(
    files: IFileInfo[],
    compressedName: string
): Promise<any> {
    if (files.length === 1) {
        // Only one file. Save it directly. Name of file should be filename.ext
        // (otherwise that would be name of zip file).
        // files[0].name = zipFilename + files[0].ext;
        return api.fs.saveTxt(files[0]);
    }

    return api.fs.saveZipWithTxtFiles(compressedName, files);
}
