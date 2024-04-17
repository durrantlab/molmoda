// You can load some molecule files using 3Dmol.js directly, without requiring
// any conversion. See https://3dmol.csb.pitt.edu/doc/types.html#FileFormats

import * as api from "@/Api";
import type { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { parseUsing3DMolJs } from "./_ParseUsing3DMolJs";
import { parseUsingOpenBabel } from "./_ParseUsingOpenBabel";
import { parseUsingMolModa } from "./_ParseUsingMolModa";
import { molFormatInformation, MolLoader } from "../Types/MolFormats";
import type { FileInfo } from "@/FileSystem/FileInfo";
import { getFileNameParts } from "@/FileSystem/FilenameManipulation";
import { IGen3DOptions } from "@/FileSystem/OpenBabel/OpenBabel";
// import { parseUsingJsZip } from "./ParseUsingJsZip";

// TODO: Might want to load other data too. Could add here. Perhaps a hook that
// plugins can use...

// Create a list of extensions (upper case).
const _allAcceptableFileTypes = Object.values(molFormatInformation).reduce(
    (acc, val) => acc.concat(val.exts.map((x) => x.toUpperCase())),
    [] as string[]
);
_allAcceptableFileTypes.sort();

// And list of extensions for use in input file type "accept" parameter.
export const fileTypesAccepts =
    _allAcceptableFileTypes.map((f) => `.${f.toLowerCase()}`).join(",") +
    ",.zip";

/**
 * Given a title, correct common problems with the title.
 *
 * @param  {string} title  The title to fix.
 * @param  {string} defaultTitle  The default title to use if none is found.
 * @returns {string}  The fixed title.
 */
function _fixTitle(title: string, defaultTitle: string): string {
    if ([undefined, ""].indexOf(title) !== -1) {
        return defaultTitle;
    }
    title = title.replace("*****", defaultTitle);

    // If t.title starts with ":", remove that.
    if (title.startsWith(":")) {
        title = title.slice(1);
    }

    return title;
}

/**
 * Given an IFileInfo object (name, contents, type), load the molecule. Should
 * call only from TreeNodeList.load.
 *
 * @param  {FileInfo}      fileInfo           The file info object.
 * @param  {boolean}       addToTree          Whether to add the molecule to the
 *                                            tree.
 * @param  {boolean}       desalt             Whether to desalt the molecule.
 * @param  {IGen3DOptions} [gen3D=undefined]  Whether and how to generate 3D
 *                                            coordinates.
 * @param  {string}        defaultTitle       The default title to use if none
 *                                            is found.
 * @returns {Promise<void | TreeNodeList>}  A promise that resolves when the
 *     molecule is loaded.
 */
export function _parseMoleculeFile(
    fileInfo: FileInfo,
    addToTree = true,
    desalt = false,
    gen3D?: IGen3DOptions,
    defaultTitle = "Molecule"
): Promise<void | TreeNodeList> {
    const spinnerId = api.messages.startWaitSpinner();

    const formatInfo = fileInfo.getFormatInfo();
    if (formatInfo === undefined) {
        return Promise.reject();
    }

    // Adjust desalt perameter if needed
    if (formatInfo.neverDesalt === true) {
        console.warn(
            `File format ${formatInfo.description} does not support desalting.`
        );
        desalt = false;
    }

    // Apply text pre processor.
    if (formatInfo.textPreProcessor) {
        fileInfo.contents = formatInfo.textPreProcessor(fileInfo.contents);
    }

    // For 3dmoljs and openbabel loading, models should be merged. So save the
    // promise instead of returning immediately.
    let promise: Promise<TreeNodeList>;

    switch (formatInfo.loader) {
        case MolLoader.Mol3D: {
            promise = parseUsing3DMolJs(fileInfo, formatInfo);
            break;
        }
        case MolLoader.OpenBabel: {
            promise = parseUsingOpenBabel(fileInfo, formatInfo, desalt, gen3D);
            break;
        }
        case MolLoader.MolModaFormat: {
            return parseUsingMolModa(fileInfo).then((payload: any) => {
                api.messages.stopWaitSpinner(spinnerId);
                return payload;
            });
        }
        // case MolLoader.Zip: {
        //     return parseUsingJsZip(fileInfo);
        // }
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return promise
        .then((treeNodeList: TreeNodeList) => {
            // Merge the TreeNodeLists into one
            // for (let i = 1; i < treeNodeLists.length; i++) {
            //     treeNodeList.extend(treeNodeLists[i]);
            // }

            if (treeNodeList.length === 0) {
                let msg =
                    "<p>File contained no valid molecules. Are you certain it's correctly formatted?</p>";

                // Get first 5 lines of fileInfo.contents
                if (fileInfo.contents.trim() !== "") {
                    // const first5Lines = fileInfo.contents
                    //     .split("\n")
                    //     .slice(0, 5);
                    // let first5LinesStr = first5Lines.join("\n");

                    // // Add line ... if appropriate
                    // first5LinesStr +=
                    //     fileInfo.contents.length > first5LinesStr.length
                    //         ? "\n..."
                    //         : "";

                    msg += `<p>File contents:</p><code><textarea disabled class="form-control" rows="3">${fileInfo.contents}</textarea>`;
                }
                api.messages.popupError(msg);
                return treeNodeList;
            }

            // Merge the tree nodes into one (so all compounds of multi-compound
            // file under single "Compounds").
            const topLevelName = getFileNameParts(fileInfo.name).basename;
            const mergedTreeNodeList = treeNodeList.merge(topLevelName);

            // Make sure all molecules have a title. A title of a
            // terminal can be undefined if pasting, for example,
            // `C1C(N(C2=C(N1)N=C(NC2=O)N)C=O)CNC3=CC=C(C=C3)C(=O)NC(CCC(=O)[O-])C(=O)[O-].O.[Ca+2]`
            // TODO: Would be good to figure out why this happens, rather than fixing it here.
            mergedTreeNodeList.flattened.forEach((t) => {
                t.title = _fixTitle(t.title, defaultTitle);
            });

            // if (treeNode.nodes && treeNode.nodes.terminals) {
            //     treeNode.nodes.terminals.forEach((terminal) => {
            //         terminal.title = terminal.title.replace("*****", defaultTitle);
            //     });
            // }

            if (addToTree) {
                mergedTreeNodeList.addToMainTree();
            }

            api.messages.stopWaitSpinner(spinnerId);

            return mergedTreeNodeList;
        })
        .catch((err) => {
            api.messages.stopWaitSpinner(spinnerId);
            throw err;
        });
}
