import { FileInfo } from "@/FileSystem/FileInfo";
import { fetchCid, fetchCidsBatch } from "./PubChemAPI";
import { ISoftwareCredit, Licenses } from "@/Plugins/PluginInterfaces";
import {
    buildCidLink,
    buildCidNotFoundHtml,
    getPubChemCidFromTreeNode,
    setPubChemCidOnTreeNode,
    setPubChemNotFoundOnTreeNode,
} from "./PubChemCidAssociation";

/**
 * Looks up the PubChem CID for a SMILES extracted from a FileInfo.
 * Uses the CID recorded on the molecule's tree node when available so
 * a second call on the same compound never hits the network. After a
 * fresh network lookup the result is stamped onto the tree node:
 * either the resolved CID (success path) or the not-found marker
 * (failure path), so the user sees feedback under the PubChem section
 * regardless of outcome.
 *
 * @param {FileInfo} molFileInfo  The compound file info (contents has SMILES).
 * @returns {Promise<ICidLookupResult>}  The CID lookup result.
 */
export async function lookupCid(molFileInfo: FileInfo): Promise<ICidLookupResult> {
    const smiles = molFileInfo.contents.split(" ")[0].split("\t")[0];
    const cached = getPubChemCidFromTreeNode(molFileInfo.treeNode);
    if (cached !== null) {
        return {
            cid: cached,
            found: true,
            cidLink: buildCidLink(cached),
            notFoundHtml: buildCidNotFoundHtml(smiles),
        };
    }
    const cid = await fetchCid(smiles);
    const found = cid !== "0" && !cid.startsWith("Error") && !cid.startsWith("Network");
    if (found) {
        setPubChemCidOnTreeNode(molFileInfo.treeNode, cid);
    } else {
        setPubChemNotFoundOnTreeNode(molFileInfo.treeNode, smiles);
    }
    return {
        cid,
        found,
        cidLink: buildCidLink(cid),
        notFoundHtml: buildCidNotFoundHtml(smiles),
    };
}

/**
 * Batched counterpart to lookupCid. Partitions input into cache hits
 * and network lookups: cached molecules are resolved instantly without
 * any HTTP, the rest go through fetchCidsBatch concurrently. Both the
 * resolved-success and not-found cases stamp the tree node so future
 * calls (and the user-visible PubChem table) reflect the outcome.
 * Returned results are index-aligned to the input.
 *
 * @param {FileInfo[]} molFileInfos  Compounds whose SMILES should be resolved.
 * @param {Function}   [onProgress]  Optional callback receiving the count of
 *                                   molecules whose CID status is known
 *                                   (cached + freshly resolved).
 * @returns {Promise<ICidLookupResult[]>}  Lookup results aligned to input.
 */
export async function lookupCidsBatch(
    molFileInfos: FileInfo[],
    onProgress?: (completed: number) => void
): Promise<ICidLookupResult[]> {
    const results: ICidLookupResult[] = new Array(molFileInfos.length);
    const smilesList: string[] = molFileInfos.map(
        (m) => m.contents.split(" ")[0].split("\t")[0]
    );
    // Indices of molecules whose CID we still need to fetch over the network.
    const networkIndices: number[] = [];
    const networkSmiles: string[] = [];
    let cachedCount = 0;
    for (let i = 0; i < molFileInfos.length; i++) {
        const cached = getPubChemCidFromTreeNode(molFileInfos[i].treeNode);
        if (cached !== null) {
            results[i] = {
                cid: cached,
                found: true,
                cidLink: buildCidLink(cached),
                notFoundHtml: buildCidNotFoundHtml(smilesList[i]),
            };
            cachedCount += 1;
        } else {
            networkIndices.push(i);
            networkSmiles.push(smilesList[i]);
        }
    }
    // Report cached hits immediately so the progress bar reflects work
    // that didn't actually require a request.
    if (onProgress) {
        onProgress(cachedCount);
    }
    if (networkSmiles.length === 0) {
        return results;
    }
    let networkCompleted = 0;
    const resolved = await fetchCidsBatch(networkSmiles, () => {
        networkCompleted += 1;
        if (onProgress) {
            onProgress(cachedCount + networkCompleted);
        }
    });
    for (let k = 0; k < networkIndices.length; k++) {
        const i = networkIndices[k];
        const cid = resolved[k];
        const smiles = smilesList[i];
        const found = cid !== null && cid !== "0";
        const cidForLink = found ? (cid as string) : "0";
        if (found) {
            setPubChemCidOnTreeNode(
                molFileInfos[i].treeNode,
                cidForLink
            );
        } else {
            setPubChemNotFoundOnTreeNode(
                molFileInfos[i].treeNode,
                smiles
            );
        }
        results[i] = {
            cid: cidForLink,
            found,
            cidLink: buildCidLink(cidForLink),
            notFoundHtml: buildCidNotFoundHtml(smiles),
        };
    }
    return results;
}

/**
 * Shared PubChem software credit used by all three PubChem plugins
 * (Names, Properties, Bioassays). Centralised here so citation metadata
 * is maintained in exactly one place.
 */
export const pubchemCredit: ISoftwareCredit = {
    name: "PubChem",
    url: "https://pubchem.ncbi.nlm.nih.gov/",
    license: Licenses.PUBLICDOMAIN,
    citations: [
        {
            title: "PubChem 2023 update",
            authors: ["Kim, S", "Chen, J"],
            journal: "Nucleic Acids Res.",
            volume: 51,
            issue: "D1",
            pages: "D1373-D1380",
            year: 2023,
        },
    ],
};

/** Result of a CID lookup, providing both the CID and a pre-built HTML link. */
interface ICidLookupResult {
    cid: string;
    found: boolean;
    cidLink: string;
    notFoundHtml: string;
}

