// You can load some molecule files using 3Dmol.js directly, without requiring
// any conversion. See https://3dmol.csb.pitt.edu/doc/types.html#FileFormats
import { messagesApi } from "@/Api/Messages";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { parseUsing3DMolJs } from "./_ParseUsing3DMolJs";
import { parseUsingOpenBabel } from "./_ParseUsingOpenBabel";
import { parseUsingMolModa } from "./_ParseUsingMolModa";
import { molFormatInformation, MolLoader } from "../Types/MolFormats";
import { getFileNameParts } from "@/FileSystem/FilenameManipulation";
import { addDefaultLoadMolParams, ILoadMolParams } from "./Types";
import { stopAllWaitSpinners } from "@/UI/MessageAlerts/WaitSpinner";
import { isAnyPopupOpen } from "@/UI/MessageAlerts/Popups/OpenPopupList";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { PopupVariant } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import { beginBatchTreeUpdate, endBatchTreeUpdate } from "@/TreeNodes/TreeCache";
import { makeEasyParser } from "./EasyParser";
import type { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";

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
 * Given an IFileInfo object (name, contents, type), load the molecule.
 * Handles parsing, post-processing titles, checking visibility limits, and optionally adding to the tree.
 *
 * @param  {ILoadMolParams} params  The parameters for loading the molecule.
 * @returns {Promise<void | TreeNodeList>}  A promise that resolves when the
 *  molecule is loaded.
 */
export function parseAndLoadMoleculeFile(
    params: ILoadMolParams
): Promise<void | TreeNodeList> {
    params = addDefaultLoadMolParams(params);

    const spinnerId = messagesApi.startWaitSpinner();

    const formatInfo = params.fileInfo.getFormatInfo();
    if (formatInfo === undefined) {
        const errorMessage = `Could not determine file format for "${params.fileInfo.name}".`;
        messagesApi.popupError(errorMessage);
        return Promise.reject(new Error(errorMessage));
    }

    // Adjust desalt perameter if needed
    if (formatInfo.neverDesalt === true) {
        console.warn(
            `File format ${formatInfo.description} does not support desalting.`
        );
        params.desalt = false;
    }

    // Apply text pre processor.
    if (formatInfo.textPreProcessor) {
        params.fileInfo.contents = formatInfo.textPreProcessor(
            params.fileInfo.contents
        );
    }

    // For 3dmoljs and openbabel loading, models should be merged. So save the
    // promise instead of returning immediately.
    let promise: Promise<TreeNodeList>;

    let { loader } = formatInfo;

    // Here we must deal with a difficult situation. If would be MUCH faster to
    // load MOL2 files using Mol3D, not OpenBabel. But MOL2 uses OpenBabel by
    // default for desalting. If desalting isn't needed, let's switch back to Mol3D.
    if (formatInfo.primaryExt === "mol2" && !params.desalt) {
        loader = MolLoader.Mol3D;
    }

    switch (loader) {
        case MolLoader.Mol3D: {
            promise = parseUsing3DMolJs(params.fileInfo, formatInfo);
            break;
        }
        case MolLoader.OpenBabel: {
            promise = parseUsingOpenBabel(
                params.fileInfo,
                formatInfo,
                params.desalt,
                params.gen3D,
                params.surpressMsgs
            );
            break;
        }
        case MolLoader.MolModaFormat: {
            return parseUsingMolModa(params.fileInfo).then((payload: any) => {
                messagesApi.stopWaitSpinner(spinnerId);
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
        .then(async (treeNodeList: TreeNodeList) => {
            // Merge the TreeNodeLists into one
            // for (let i = 1; i < treeNodeLists.length; i++) {
            //  treeNodeList.extend(treeNodeLists[i]);
            // }

            if (treeNodeList.length === 0) {
                if (isAnyPopupOpen()) {
                    stopAllWaitSpinners();
                    return treeNodeList;
                }

                let msg =
                    "<p>File contained no valid molecules. Are you certain it's correctly formatted?</p>";

                stopAllWaitSpinners();

                // Get first 5 lines of fileInfo.contents
                if (params.fileInfo.contents.trim() !== "") {
                    // const first5Lines = fileInfo.contents
                    //  .split("\n")
                    //  .slice(0, 5);
                    // let first5LinesStr = first5Lines.join("\n");

                    // // Add line ... if appropriate
                    // first5LinesStr +=
                    //  fileInfo.contents.length > first5LinesStr.length
                    //   ? "\n..."
                    //   : "";
                    msg += `<p>File contents:</p><code><textarea disabled class="form-control" rows="3">${params.fileInfo.contents}</textarea>`;
                }
                messagesApi.popupError(msg);
                return treeNodeList;
            }

            // Merge the tree nodes into one (so all compounds of multi-compound
            // file under single "Compounds").
            const topLevelName = getFileNameParts(
                params.fileInfo.name
            ).basename;

            const mergedTreeNodeList = treeNodeList.merge(topLevelName);

            // Make sure all molecules have a title. A title of a
            // terminal can be undefined if pasting, for example,
            // `C1C(N(C2=C(N1)N=C(NC2=O)N)C=O)CNC3=CC=C(C=C3)C(=O)NC(CCC(=O)[O-])C(=O)[O-].O.[Ca+2]`
            // TODO: Would be good to figure out why this happens, rather than fixing it here.
            mergedTreeNodeList.flattened.forEach((t) => {
                t.title = _fixTitle(t.title, params.defaultTitle as string);
            });

            // Get all the terminal nodes to process titles and visibility.
            const terminalNodes = mergedTreeNodeList.terminals;

            // Validate each terminal node's model. Collect references to
            // nodes that are empty or unparseable so they can be pruned
            // before adding to the tree.
            let hasValidModel = false;
            const invalidNodes: TreeNode[] = [];
            for (let i = 0; i < terminalNodes.length; i++) {
                const node = terminalNodes.get(i);
                if (node.model) {
                    try {
                        const parser = makeEasyParser(node.model);
                        if (parser.length > 0) {
                            parser.getAtom(0);
                            hasValidModel = true;
                            continue;
                        }
                    } catch {
                        // Model is present but unparseable
                    }
                }
                invalidNodes.push(node);
            }
            
            if (!hasValidModel) {
                messagesApi.stopWaitSpinner(spinnerId);
                messagesApi.popupError(
                    `<p>Could not read any valid molecules from "${params.fileInfo.name}". ` +
                    `The file may not be properly formatted.</p>`
                );
                return undefined;
            }

            // Remove invalid terminal nodes from the tree so they never
            // reach the viewer or appear in the navigation panel.
            if (invalidNodes.length > 0) {
                for (const badNode of invalidNodes) {
                    mergedTreeNodeList.flattened.forEach((parent: TreeNode) => {
                        if (parent.nodes) {
                            parent.nodes.removeNode(badNode);
                        }
                    });
                }

                // Prune any container nodes left empty after removing
                // invalid terminals. Repeat until no more empty
                // containers remain (handles nested single-child chains).
                let pruned = true;
                while (pruned) {
                    pruned = false;
                    mergedTreeNodeList.flattened.forEach((parent: TreeNode) => {
                        if (parent.nodes) {
                            const before = parent.nodes.length;
                            parent.nodes = parent.nodes.filter(
                                (child: TreeNode) => {
                                    // Keep terminal nodes (they survived
                                    // validation) and containers that still
                                    // have children.
                                    if (child.model) return true;
                                    if (child.nodes && child.nodes.length > 0) return true;
                                    return false;
                                }
                            );
                            if (parent.nodes.length < before) {
                                pruned = true;
                            }
                    }
                });
                }
            }

            // Re-query terminals after pruning.
            const validTerminalNodes = mergedTreeNodeList.terminals;

            // If pruning removed everything, show an error.
            if (validTerminalNodes.length === 0) {
                messagesApi.stopWaitSpinner(spinnerId);
                messagesApi.popupError(
                    `<p>Could not read any valid molecules from "${params.fileInfo.name}". ` +
                    `The file may not be properly formatted.</p>`
                );
                return mergedTreeNodeList;
            }

            for (let i = 0; i < validTerminalNodes.length; i++) {
                const node = validTerminalNodes.get(i);
                if (node.title.indexOf("undefined") >= 0) {
                    const { basename } = getFileNameParts(params.fileInfo.name);
                    node.title = basename + ":" + (i + 1).toString();
                }
            }

            // If hideOnLoad is true, set all nodes (including parents) to invisible.
            if (params.hideOnLoad) {
                mergedTreeNodeList.flattened.forEach((n) => {
                    n.visible = false;
                });
            }

            if (params.addToTree) {
                // Defer cache invalidation until the entire batch of nodes
                // has been added to the store. Without this, each push
                // invalidates all flattened/terminal caches, causing O(n^2)
                // recomputation during multi-molecule loads.
                beginBatchTreeUpdate();
                try {
                    mergedTreeNodeList.addToMainTree(
                        params.tag,
                        true,
                        true,
                        !params.hideOnLoad
                    );
                } finally {
                    endBatchTreeUpdate();
                }

                // If not hiding on load, check if we need to warn about too many visible molecules.
                if (!params.hideOnLoad) {
                    const initialCompoundsVisible = await getSetting(
                        "initialCompoundsVisible"
                    );
                    if (validTerminalNodes.length > initialCompoundsVisible) {
                        messagesApi.popupMessage(
                            "Some Molecules not Visible",
                            `The ${params.fileInfo.name} file contained ${validTerminalNodes.length} molecules. Only ${initialCompoundsVisible} are initially shown for performance's sake. Use the Navigator to toggle the visibility of the remaining molecules.`,
                            PopupVariant.Info,
                            undefined,
                            false,
                            {}
                        );
                    }
                }
            }

            messagesApi.stopWaitSpinner(spinnerId);
            return mergedTreeNodeList;
        })
        .catch((err) => {
            messagesApi.stopWaitSpinner(spinnerId);
            const fileName = params.fileInfo.name || "unknown file";
            messagesApi.popupError(
                `<p>Failed to load "<b>${fileName}</b>". The file may not be properly formatted.</p>` +
                `<p>Error: ${err.message || String(err)}</p>`
            );
            return undefined;
        });
}
