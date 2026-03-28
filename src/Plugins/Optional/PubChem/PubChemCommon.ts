import { FileInfo } from "@/FileSystem/FileInfo";
import { fetchCid } from "./PubChemAPI";
import { ISoftwareCredit, Licenses } from "@/Plugins/PluginInterfaces";

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
export interface ICidLookupResult {
    cid: string;
    found: boolean;
    cidLink: string;
    notFoundHtml: string;
}

/**
 * Looks up the PubChem CID for a SMILES string extracted from a FileInfo,
 * returning a structured result with an HTML link. This avoids duplicating
 * the "extract SMILES -> fetchCid -> build link or error HTML" logic
 * across PubChemNamesPlugin, PubChemPropsPlugin, and PubChemBioassaysPlugin.
 *
 * @param {FileInfo} molFileInfo  The compound file info (contents has SMILES).
 * @returns {Promise<ICidLookupResult>}  The CID lookup result.
 */
export async function lookupCid(molFileInfo: FileInfo): Promise<ICidLookupResult> {
    const smiles = molFileInfo.contents.split(" ")[0].split("\t")[0];
    const cid = await fetchCid(smiles);
    const found = cid !== "0";
    const encodedSmiles = encodeURIComponent(smiles);
    return {
        cid,
        found,
        cidLink: `<a href="https://pubchem.ncbi.nlm.nih.gov/compound/${cid}" target="_blank">${cid}</a>`,
        notFoundHtml: `PubChem compound not found! <a href="https://pubchem.ncbi.nlm.nih.gov/#query=${encodedSmiles}" target="_blank">Search PubChem</a>`,
    };
}