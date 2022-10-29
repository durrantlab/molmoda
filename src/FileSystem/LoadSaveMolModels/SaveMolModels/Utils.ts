import { ISaveTxt } from "@/Core/FS";
import { slugify } from "@/Core/Utils";
import { getFileNameParts } from "@/FileSystem/Utils";
import {
    IAtom,
    IMolContainer,
    MolType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { convertMolContainers } from "../ConvertMolModels/ConvertMolContainer";
import { getFormatInfoGivenExt, IFormatInfo } from "../Definitions/MolFormats";
import * as api from "@/Api";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";

/**
 * Finds terminal nodes, and separates them into compounds and non-compounds.
 *
 * @param  {IMolContainer[]} molContainers  All compounds.
 * @returns {any}  The terminal nodes, separated into
 *     compounds and non-compounds.
 */
export function separateCompoundNonCompoundTerminalNodes(
    molContainers: IMolContainer[]
): {[key: string]: IMolContainer[]} {
    const terminalNodes = getTerminalNodes(molContainers);
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
 * @returns {Promise<ISaveTxt[]>}  A promise that resolves to a list of ISaveTxt
 *     containing the texts for saving.
 */
export function getSaveTxtPromises(
    nodes: IMolContainer[],
    targetExt: string,
    merge: boolean,
    filename?: string
): Promise<ISaveTxt[]> {
    return convertMolContainers(nodes, targetExt, merge).then(
        (compoundTxts: string[]) => {
            return compoundTxts.map((txt, idx) => {
                // Prepend the chain
                const molEntry = nodes[idx] as IMolContainer;

                return {
                    fileName:
                        filename === undefined
                            ? getFilename(molEntry, targetExt)
                            : `${filename}.${targetExt}`,
                    content: txt,
                    ext: `.${targetExt}`,
                } as ISaveTxt;
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
    const formatInfo = getFormatInfoGivenExt(format) as IFormatInfo;
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
 * Given a list of ISaveTxt objects (e.g., from getSaveTxtPromises), save them
 * to the disk. Compress if necessary.
 *
 * @param  {ISaveTxt[]} files     The files to save.
 * @param  {string}     filename  The filename to use.
 * @returns {Promise<any>}  A promise that resolves when the files are saved.
 */
export function saveTxtFiles(
    files: ISaveTxt[],
    filename: string
): Promise<any> {
    if (files.length === 1) {
        // Only one file. Save it directly. Name of file should be filename.ext
        // (otherwise that would be name of zip file).
        files[0].fileName = filename + files[0].ext;
        return api.fs.saveTxt(files[0]);
    }
    
    return api.fs.saveZipWithTxtFiles(
        {
            fileName: filename,
        } as ISaveTxt,
        files
    );
}
