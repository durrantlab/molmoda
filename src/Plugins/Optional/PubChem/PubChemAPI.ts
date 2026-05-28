import { dynamicImports } from "../../../Core/DynamicImports";
import { RateLimitedFetcherQueue, ResponseType } from "../../../Core/Fetcher";
import {
    easyCountHeavyAtomsSmiles,
    easyDesaltSMILES,
    easyNeutralizeSMILES,
    easyStripStereoSMILES,
} from "../../../FileSystem/LoadSaveMolModels/ParseMolModels/EasySmilesUtils";

// Prevent calls to PubChem that are too frequent. They prefer 5 calls per
// second. Let's use 4 to be on the safe side.
const pubChemQueue = new RateLimitedFetcherQueue(4, {
    responseType: ResponseType.JSON,
});

interface ICompoundData {
    CID: number;
    SMILES: string;
    sortMetric: number;
}

/** A single assaysummary row, keyed by PubChem column name. */
export interface IAssayRecord {
    [column: string]: string;
}

/**
 * Result of ranking one compound's assays: either the kept ActiveAssays or
 * an error string. Deliberately non-discriminated to match the loose shape
 * the bioassay plugin already consumes (checks .error, then .ActiveAssays).
 */
export interface IAssaysResult {
    ActiveAssays?: IAssayRecord[];
    error?: string;
}

/**
 * A helper function that fetches a CID from a SMILES string.
 *
 * @param {string} smiles The SMILES string of the compound.
 * @returns {Promise<string>} A promise that resolves to a CID or an error message.
 */
export async function fetchCid(smiles: string): Promise<string> {
    smiles = easyNeutralizeSMILES(smiles);
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(
        smiles
    )}/cids/JSON`;
    try {
        const data = await pubChemQueue.enqueue(url);
        const cids = data?.IdentifierList?.CID ?? [];
        if (cids.length > 0) {
            return String(cids[0]);
        } else {
            return "Error: Invalid SMILES string or no CID found for the given SMILES.";
        }
    } catch (error: any) {
        return `Network Error: ${error.message}`;
    }
}

/**
 * A helper function that fetches molecule details (descriptions, sources, etc.) for a given CID.
 *
 * @param {string} cid The CID of the compound.
 * @returns {Promise<any>} A promise that resolves to an array of description objects or an error object.
 */
// export async function fetchMoleculeDetails(cid: string): Promise<any> {
//     const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/description/JSON`;
//     try {
//         const data = await pubChemQueue.enqueue(url);
//         const informationList = data?.InformationList?.Information ?? [];
//         const results: any[] = [];

//         for (const info of informationList) {
//             const details: any = {
//                 CID: info?.CID ?? "N/A",
//             };
//             const description = info?.Description;
//             const source = info?.DescriptionSourceName;
//             const infoUrl = info?.DescriptionURL;

//             if (description) {
//                 details.Description = description;
//             }
//             if (source) {
//                 details.Source = source;
//             }
//             if (infoUrl) {
//                 details.URL = infoUrl;
//             }

//             results.push(details);
//         }

//         return results.length > 0
//             ? results
//             : [{ error: "No information available for the given CID." }];
//     } catch (error: any) {
//         return { error: `Network issue occurred: ${error.message}` };
//     }
// }

/**
 * A helper function that fetches patent information for a given CID.
 *
 * @param {string} cid The CID of the compound.
 * @returns {Promise<any>} A promise that resolves to an object containing patent data or an error message.
 */
// async function fetchPatents(cid: string): Promise<any> {
//     const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/PatentCount,PatentFamilyCount/JSON`;
//     try {
//         const data = await pubChemQueue.enqueue(url);
//         const properties = data?.PropertyTable?.Properties ?? [];

//         if (properties.length > 0) {
//             const result = properties[0];
//             const patentCount = result?.PatentCount ?? "Not available";
//             const patentFamilyCount = result?.PatentFamilyCount ?? "Not available";
//             return {
//                 PatentCount: patentCount,
//                 PatentFamilyCount: patentFamilyCount
//             };
//         } else {
//             return { CID: cid, "Error": "No patent data available" };
//         }

//     } catch (error: any) {
//         return { CID: cid, "Error": `An error occurred: ${error.message}` };
//     }
// }

/**
 * Resolves a list of SMILES strings to PubChem CIDs concurrently. PubChem's
 * REST API does not support batched SMILES->CID lookup (the SMILES sits in
 * the URL path), so we fire individual requests through pubChemQueue, which
 * rate-limits them at 4/sec. The returned array is index-aligned with the
 * input: position i holds the CID for smilesList[i], or null if not found.
 *
 * @param {string[]} smilesList  The SMILES strings to resolve.
 * @param {Function} [onProgress]  Optional callback invoked after each CID
 *                                 resolves, with the count of completed
 *                                 lookups.
 * @returns {Promise<(string | null)[]>}  Array of CIDs (or null) aligned to input.
 */
export async function fetchCidsBatch(
    smilesList: string[],
    onProgress?: (completed: number) => void
): Promise<(string | null)[]> {
    let completed = 0;
    const results = await Promise.all(
        smilesList.map(async (smiles) => {
            const cid = await fetchCid(smiles);
            completed += 1;
            if (onProgress) {
                onProgress(completed);
            }
            // fetchCid returns either a numeric CID string or an error message
            // beginning with "Error:" / "Network Error:". Normalise to null on
            // failure so callers don't have to string-match.
            if (!cid || cid.startsWith("Error") || cid.startsWith("Network")) {
                return null;
            }
            return cid;
        })
    );
    return results;
}

/**
 * Fetches properties for many CIDs using PubChem's comma-separated CID form,
 * issuing one request per chunk of `chunkSize` CIDs. Returns a map from CID
 * to the same property object shape used by fetchCompoundsProperties (or to
 * an error object). PubChem may silently omit CIDs that fail, so any input
 * CID missing from the response is reported as an error in the result map.
 *
 * @param {string[]} cids        The CIDs to query.
 * @param {Function} [onProgress]  Optional callback invoked after each chunk
 *                                 completes, with the number of CIDs
 *                                 processed so far.
 * @param {number}   [chunkSize]  How many CIDs to request per call. Default
 *                                 100, which matches PubChem's documented
 *                                 soft limit for property queries.
 * @returns {Promise<{ [cid: string]: any }>}  CID -> properties (or { error }).
 */
export async function fetchCompoundsPropertiesBatch(
    cids: string[],
    onProgress?: (completed: number) => void,
    chunkSize = 100
): Promise<{ [cid: string]: any }> {
    const propsPath =
        "MolecularFormula,MolecularWeight," +
        "IUPACName,XLogP,ExactMass,TPSA,Complexity,Charge," +
        "HBondDonorCount,HBondAcceptorCount,RotatableBondCount,HeavyAtomCount," +
        "AtomStereoCount,BondStereoCount,CovalentUnitCount,Volume3D";

    const resultMap: { [cid: string]: any } = {};
    let completed = 0;

    for (let i = 0; i < cids.length; i += chunkSize) {
        const chunk = cids.slice(i, i + chunkSize);
        const url =
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${chunk.join(
                ","
            )}/property/${propsPath}/JSON`;
        try {
            const data = await pubChemQueue.enqueue(url);
            const properties = data?.PropertyTable?.Properties ?? [];
            for (const prop of properties) {
                const cidStr = String(prop?.CID ?? "");
                if (!cidStr) {
                    continue;
                }
                resultMap[cidStr] = {
                    Formula: prop?.MolecularFormula ?? "N/A",
                    Weight: prop?.MolecularWeight ?? "N/A",
                    "IUPAC Name": prop?.IUPACName ?? "N/A",
                    XLogP: prop?.XLogP ?? "N/A",
                    "Exact Mass": prop?.ExactMass ?? "N/A",
                    TPSA: prop?.TPSA ?? "N/A",
                    Complexity: prop?.Complexity ?? "N/A",
                    Charge: prop?.Charge ?? "N/A",
                    HBD: prop?.HBondDonorCount ?? "N/A",
                    HBA: prop?.HBondAcceptorCount ?? "N/A",
                    "Rot Bonds": prop?.RotatableBondCount ?? "N/A",
                    "Heavy Atoms": prop?.HeavyAtomCount ?? "N/A",
                    "Atom Stereos": prop?.AtomStereoCount ?? "N/A",
                    "Bond Stereos": prop?.BondStereoCount ?? "N/A",
                    "Volume (3D)": prop?.Volume3D ?? "N/A",
                };
            }
        } catch (error: any) {
            // Whole chunk failed: mark every CID in this chunk as errored so
            // the caller can still produce a row per requested molecule.
            const msg =
                error?.response?.data?.Fault?.Message ??
                `Failed to retrieve properties due to network issue: ${error.message}`;
            for (const cid of chunk) {
                resultMap[cid] = { error: msg };
            }
        }
        completed += chunk.length;
        if (onProgress) {
            onProgress(completed);
        }
    }

    // Any CID that PubChem silently dropped (returned 200 but no row) gets a
    // sentinel error so the caller knows to render a "not found" row instead
    // of nothing at all.
    for (const cid of cids) {
        if (!(cid in resultMap)) {
            resultMap[cid] = { error: "No properties returned for this CID." };
        }
    }
    return resultMap;
}

/**
 * Fetches synonyms for many CIDs using PubChem's comma-separated CID form.
 * Same chunking strategy as fetchCompoundsPropertiesBatch.
 *
 * @param {string[]} cids         The CIDs to query.
 * @param {Function} [onProgress]  Optional progress callback.
 * @param {number}   [chunkSize]  CIDs per request. Default 100.
 * @returns {Promise<{ [cid: string]: string[] }>}  CID -> synonyms array.
 *     Missing CIDs map to an empty array.
 */
export async function fetchSynonymsBatch(
    cids: string[],
    onProgress?: (completed: number) => void,
    chunkSize = 100
): Promise<{ [cid: string]: string[] }> {
    const resultMap: { [cid: string]: string[] } = {};
    let completed = 0;

    for (let i = 0; i < cids.length; i += chunkSize) {
        const chunk = cids.slice(i, i + chunkSize);
        const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${chunk.join(
            ","
        )}/synonyms/JSON`;
        try {
            const data = await pubChemQueue.enqueue(url);
            const infoList = data?.InformationList?.Information ?? [];
            for (const info of infoList) {
                const cidStr = String(info?.CID ?? "");
                if (!cidStr) {
                    continue;
                }
                resultMap[cidStr] = Array.isArray(info?.Synonym)
                    ? info.Synonym
                    : [];
            }
        } catch {
            // On chunk failure, leave these CIDs absent; the caller will treat
            // missing entries as "no synonyms available" rather than as an
            // error worth surfacing (properties already carry the error path).
        }
        completed += chunk.length;
        if (onProgress) {
            onProgress(completed);
        }
    }

    for (const cid of cids) {
        if (!(cid in resultMap)) {
            resultMap[cid] = [];
        }
    }
    return resultMap;
}

/**
 * A helper function that fetches synonyms for a given CID.
 *
 * @param {string} cid The CID of the compound.
 * @returns {Promise<any>} A promise that resolves to an object containing synonyms or an error message.
 */
export async function fetchSynonyms(cid: string): Promise<any> {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`;
    try {
        const data = await pubChemQueue.enqueue(url);
        const descriptions = data?.InformationList?.Information ?? [{}];
        if (descriptions.length > 0) {
            const synonyms = descriptions[0];
            return { Synonyms: synonyms?.Synonym ?? "No Synonyms available" };
        } else {
            return { error: "No synonyms available" };
        }
    } catch (error: any) {
        return {
            error: `Failed to retrieve synonyms due to network issue: ${error.message}`,
        };
    }
}

/**
 * A helper function that fetches various properties for a given CID.
 *
 * @param {string} cid The CID of the compound.
 * @returns {Promise<any>} A promise that resolves to an object containing compound properties or an error message.
 */
export async function fetchCompoundsProperties(cid: string): Promise<any> {
    const url =
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/` +
        "MolecularFormula,MolecularWeight," +
        "IUPACName,XLogP,ExactMass,TPSA,Complexity,Charge," +
        "HBondDonorCount,HBondAcceptorCount,RotatableBondCount,HeavyAtomCount," +
        "AtomStereoCount," +
        "BondStereoCount,CovalentUnitCount," +
        "Volume3D/JSON";
    try {
        const data = await pubChemQueue.enqueue(url);
        const properties = data?.PropertyTable?.Properties ?? [];
        if (properties.length > 0) {
            const prop = properties[0];
            const result: { [key: string]: any } = {
                Formula: prop?.MolecularFormula ?? "N/A",
                Weight: prop?.MolecularWeight ?? "N/A",
                "IUPAC Name": prop?.IUPACName ?? "N/A",
                XLogP: prop?.XLogP ?? "N/A",
                "Exact Mass": prop?.ExactMass ?? "N/A",
                TPSA: prop?.TPSA ?? "N/A",
                Complexity: prop?.Complexity ?? "N/A",
                Charge: prop?.Charge ?? "N/A",
                HBD: prop?.HBondDonorCount ?? "N/A",
                HBA: prop?.HBondAcceptorCount ?? "N/A",
                "Rot Bonds": prop?.RotatableBondCount ?? "N/A",
                "Heavy Atoms": prop?.HeavyAtomCount ?? "N/A",
                "Atom Stereos": prop?.AtomStereoCount ?? "N/A",
                "Bond Stereos": prop?.BondStereoCount ?? "N/A",
                // "Covalent Unit Count": prop?.CovalentUnitCount ?? "N/A",
                "Volume (3D)": prop?.Volume3D ?? "N/A",
            };
            return result;
        } else {
            return { error: "No properties found for the provided CID" };
        }
    } catch (error: any) {
        if (error.response.data.Fault.Message) {
            return { error: error.response.data.Fault.Message };
        }

        return {
            error: `Failed to retrieve properties due to network issue: ${error.message}`,
        };
    }
}

/**
 * A helper function that fetches hazard information (GHS Classification) for a given CID.
 *
 * @param {string} cid The CID of the compound.
 * @returns {Promise<any>} A promise that resolves to an object containing hazard info or an error message.
 */
// async function fetchHazardInformation(cid: string): Promise<any> {
//     const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON/?response_type=display&heading=GHS%20Classification`;
//     try {
//         const data = await pubChemQueue.enqueue(url);

//         const recordSections = data?.Record?.Section ?? [];
//         const safetySection = recordSections.find((section: any) => section.TOCHeading === "Safety and Hazards");
//         const hazardsSection = safetySection?.Section?.find((section: any) => section.TOCHeading === "Hazards Identification");
//         const ghsSection = hazardsSection?.Section?.find((section: any) => section.TOCHeading === "GHS Classification");

//         if (!ghsSection) {
//             return { "error": "No GHS Classification found." };
//         }

//         const pictograms: string[] = [];
//         for (const info of ghsSection.Information ?? []) {
//             if (info.Name === "Pictogram(s)") {
//                 for (const markup of info.Value.StringWithMarkup[0].Markup) {
//                     pictograms.push(markup.URL);
//                 }
//             }
//         }

//         const signalInfo = (ghsSection.Information ?? []).find((i: any) => i.Name === "Signal");
//         const signal = signalInfo?.Value?.StringWithMarkup[0]?.String;

//         const hazardStatementsInfo = (ghsSection.Information ?? []).find((i: any) => i.Name === "GHS Hazard Statements");
//         const hazardStatements = hazardStatementsInfo?.Value?.StringWithMarkup?.map((stmt: any) => stmt.String) ?? [];

//         return {
//             "Pictograms": pictograms,
//             "Signal": signal,
//             "Hazard Statements": hazardStatements
//         };
//     } catch (error: any) {
//         return { "error": `Failed to retrieve hazard information due to network issue: ${error.message}` };
//     }
// }

/**
 * Filters one compound's assay rows to active hits, then ranks and
 * de-duplicates them. Shared by the single-CID (JSON) and batch (CSV) paths
 * so both apply identical selection logic; the only difference upstream is
 * how the rows were obtained.
 *
 * @param {string[]}       columns    Column names present in the source.
 * @param {IAssayRecord[]} assayObjs  All rows for a single CID.
 * @returns {IAssaysResult} Ranked ActiveAssays, or an error.
 */
function _rankActiveAssays(
    columns: string[],
    assayObjs: IAssayRecord[]
): IAssaysResult {
    const outcomeIndex = columns.indexOf("Activity Outcome");
    if (outcomeIndex === -1) {
        return { error: "Activity Outcome column not found in data." };
    }
    const hasActivityValue = columns.indexOf("Activity Value [uM]") !== -1;
    let activeAssays: IAssayRecord[] = assayObjs.filter(
        (assay) =>
            assay["Activity Outcome"] === "Active" ||
            (hasActivityValue && assay["Activity Value [uM]"] !== "")
    );
    if (activeAssays.length === 0) {
        return { error: "No active assays found for the provided CID." };
    }
    // Sort the assays by a custom score.
    activeAssays.sort(
        (a: { [key: string]: string }, b: { [key: string]: string }) => {
            // Sort by the number of active compounds in the assay.
            let aScore = 0;
            let bScore = 0;
            // Prioritize confirmatory assays.
            if (
                a["Assay Type"] === "Confirmatory" &&
                b["Assay Type"] !== "Confirmatory"
            ) {
                aScore += 1;
            } else if (
                a["Assay Type"] !== "Confirmatory" &&
                b["Assay Type"] === "Confirmatory"
            ) {
                bScore += 1;
            }
            // Prioritize assays with Target GeneID.
            if (a["Target GeneID"] !== "" && b["Target GeneID"] === "") {
                aScore += 1;
            } else if (
                a["Target GeneID"] === "" &&
                b["Target GeneID"] !== ""
            ) {
                bScore += 1;
            }
            // Compare Activity Value [uM]
            if (a["Activity Value [uM]"] === "") {
                a["Activity Value [uM]"] = "100";
            }
            if (b["Activity Value [uM]"] === "") {
                b["Activity Value [uM]"] = "100";
            }
            aScore -= parseFloat(a["Activity Value [uM]"]) / 10.0;
            bScore -= parseFloat(b["Activity Value [uM]"]) / 10.0;
            return bScore - aScore;
        }
    );
    // Remove entries with duplicate AIDs. Keep only the first one. Not sure
    // why this happens.
    let uniqueAssays: IAssayRecord[] = [];
    const aidSet = new Set<string>();
    for (const assay of activeAssays) {
        if (assay["AID"] === "") {
            // If no AID, just add it to unique list.
            uniqueAssays.push(assay);
            continue;
        }
        if (!aidSet.has(assay["AID"])) {
            aidSet.add(assay["AID"]);
            uniqueAssays.push(assay);
        }
    }
    activeAssays = uniqueAssays;
    // Entries in the list could have duplicate Target GeneIDs. Keep only
    // the first one. Put additional ones in new list.
    uniqueAssays = [];
    const duplicateAssays: IAssayRecord[] = [];
    const geneIDs = new Set<string>();
    for (const assay of activeAssays) {
        if (assay["Target GeneID"] === "") {
            // If no gene ID, just add it to unique list.
            uniqueAssays.push(assay);
            continue;
        }
        if (!geneIDs.has(assay["Target GeneID"])) {
            geneIDs.add(assay["Target GeneID"]);
            uniqueAssays.push(assay);
            continue;
        }
        duplicateAssays.push(assay);
    }
    const activeAssaysReordered = uniqueAssays.concat(duplicateAssays);
    return { ActiveAssays: activeAssaysReordered };
}
/**
 * Minimal RFC-4180 CSV parser: handles quoted fields, embedded commas and
 * newlines, and doubled-quote escapes. Used instead of a naive split()
 * because PubChem assay names routinely contain commas inside quotes. Swap
 * for papaparse if/when it is exposed via dynamicImports.
 *
 * @param {string} text  Raw CSV text.
 * @returns {string[][]}  Rows of string cells (header included as row 0).
 */
function _parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let field = "";
    let row: string[] = [];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    // Escaped quote inside a quoted field.
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ",") {
            row.push(field);
            field = "";
        } else if (ch === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else if (ch !== "\r") {
            // Ignore lone \r so CRLF endings resolve to a single break.
            field += ch;
        }
    }
    // Flush a trailing field/row not terminated by a newline.
    if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}
/**
 * Parses a multi-CID assaysummary CSV payload into per-compound rows. The
 * single returned CSV interleaves rows for every requested CID, so rows are
 * bucketed by the value in the "CID" column.
 *
 * @param {string} csv  The CSV body returned by PubChem.
 * @returns {{columns: string[]; rowsByCid: {[cid: string]: IAssayRecord[]}}}
 */
function _parseAssaySummaryCsv(csv: string): {
    columns: string[];
    rowsByCid: { [cid: string]: IAssayRecord[] };
} {
    const table = _parseCsv(csv);
    const rowsByCid: { [cid: string]: IAssayRecord[] } = {};
    if (table.length === 0) {
        return { columns: [], rowsByCid };
    }
    const columns = table[0];
    const cidIdx = columns.indexOf("CID");
    for (let r = 1; r < table.length; r++) {
        const cells = table[r];
        const rec: IAssayRecord = {};
        for (let c = 0; c < columns.length; c++) {
            rec[columns[c]] = cells[c] ?? "";
        }
        const cid = cidIdx === -1 ? "" : cells[cidIdx] ?? "";
        if (!cid) {
            continue;
        }
        if (!rowsByCid[cid]) {
            rowsByCid[cid] = [];
        }
        rowsByCid[cid].push(rec);
    }
    return { columns, rowsByCid };
}
/**
 * Batched counterpart to fetchActiveAssays. PubChem's assaysummary endpoint
 * accepts many CIDs via an HTTP POST body (cid=2244,1983,...) and answers
 * with one CSV carrying a CID column, letting a whole compound set be
 * profiled in a handful of calls instead of one request per CID. Lists are
 * split into chunks to respect the URL-length cap (mitigated by POST) and
 * the 30-second per-request timeout (mitigated by chunking).
 *
 * @param {string[]} cids         The CIDs to query.
 * @param {Function} [onProgress]  Optional callback invoked after each chunk
 *                                 with the count of CIDs processed so far.
 * @param {number}   [chunkSize]   CIDs per request. Default 50, kept small
 *                                 because assaysummary returns many rows per
 *                                 compound and can approach the timeout.
 * @returns {Promise<{[cid: string]: IAssaysResult}>}  CID -> ranked assays
 *     (or { error }). Every input CID is present in the map.
 */
export async function fetchActiveAssaysBatch(
    cids: string[],
    onProgress?: (completed: number) => void,
    chunkSize = 50
): Promise<{ [cid: string]: IAssaysResult }> {
    const resultMap: { [cid: string]: IAssaysResult } = {};
    let completed = 0;
    const url =
        "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/assaysummary/CSV";
    for (let i = 0; i < cids.length; i += chunkSize) {
        const chunk = cids.slice(i, i + chunkSize);
        try {
            if (chunk.length === 1) {
                // PubChem's assaysummary POST rejects a bare single CID with
                // "Missing CID list"; it insists on an actual comma-separated
                // list. A lone CID is therefore resolved through the proven
                // single-CID GET path, which yields the same IAssaysResult.
                resultMap[chunk[0]] = await fetchActiveAssays(chunk[0]);
            } else {
                // Build the form-urlencoded body by hand and set the header
                // explicitly so the cid list reaches PubChem intact.
                const formPostData = `cid=${encodeURIComponent(
                    chunk.join(",")
                )}`;
            const csv = await pubChemQueue.enqueue(url, {
                formPostData,
                responseType: ResponseType.TEXT,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });
                const { columns, rowsByCid } = await _parseAssaySummaryCsv(
                    csv
                );
            for (const cid of chunk) {
                const rows = rowsByCid[cid] ?? [];
                if (rows.length === 0) {
                    // PubChem omits compounds with no assay data entirely.
                    resultMap[cid] = {
                        error: "No active assays found for the provided CID.",
                    };
                    continue;
                }
                resultMap[cid] = _rankActiveAssays(columns, rows);
                }
            }
        } catch (error: any) {
            const msg =
                error?.response?.data?.Fault?.Message ??
                `Network issue occurred: ${error.message}`;
            for (const cid of chunk) {
                resultMap[cid] = { error: msg };
            }
        }
        completed += chunk.length;
        if (onProgress) {
            onProgress(completed);
        }
    }
    for (const cid of cids) {
        if (!(cid in resultMap)) {
            resultMap[cid] = {
                error: "No active assays found for the provided CID.",
            };
        }
    }
    return resultMap;
}
/**
 * A helper function that fetches active bioassays for a given CID.
 *
 * @param {string} cid The CID of the compound.
 * @returns {Promise<IAssaysResult>} Ranked active assays or an error.
 */
export async function fetchActiveAssays(cid: string): Promise<IAssaysResult> {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/assaysummary/JSON`;
    try {
        const data = await pubChemQueue.enqueue(url);
        const table = data?.Table ?? {};
        const columns: string[] = table?.Columns?.Column ?? [];
        const rows = table?.Row ?? [];
        // Flatten the JSON Table (parallel columns/cells arrays) into keyed
        // row objects so the ranking logic is shared with the CSV path.
        const assayObjs: IAssayRecord[] = rows.map((row: any) => {
            const cells = row?.Cell ?? [];
            const assay: IAssayRecord = {};
            for (let i = 0; i < columns.length; i++) {
                assay[columns[i]] = cells[i];
            }
            return assay;
        });
        return _rankActiveAssays(columns, assayObjs);
    } catch (error: any) {
        if (error.response.data.Fault.Message) {
            return { error: error.response.data.Fault.Message };
        }
        return { error: `Network issue occurred: ${error.message}` };
    }
}
/**
 * A helper function that calculates the Tanimoto similarity between two fingerprints.
 *
 * @param {Uint8Array} fp1 The first fingerprint.
 * @param {Uint8Array} fp2 The second fingerprint.
 * @returns {number} The Tanimoto similarity.
 */
function _calculateTanimotoSimilarity(
    fp1: Uint8Array,
    fp2: Uint8Array
): number {
    if (fp1.length !== fp2.length) {
        throw new Error("Fingerprints must be of equal length");
    }

    let intersectionBits = 0;
    let unionBits = 0;

    // Process each byte
    for (let i = 0; i < fp1.length; i++) {
        const byte1 = fp1[i];
        const byte2 = fp2[i];

        // Count bits in the intersection (AND)
        const intersectionByte = byte1 & byte2;
        intersectionBits += _countBits(intersectionByte);

        // Count bits in the union (OR)
        const unionByte = byte1 | byte2;
        unionBits += _countBits(unionByte);
    }

    // Avoid division by zero
    if (unionBits === 0) {
        return 0;
    }

    return intersectionBits / unionBits;
}

/**
 * Helper function to count the number of 1 bits in a byte
 *
 * @param {number} byte  The byte to count bits in.
 * @returns {number} The number of 1 bits in the byte.
 */
function _countBits(byte: number): number {
    // Use Brian Kernighan's algorithm
    let count = 0;
    let n = byte;
    while (n) {
        n &= n - 1;
        count++;
    }
    return count;
}

/**
 * A helper function that fetches compound data given a list of CIDs.
 *
 * @param {number[]} cids  The list of CIDs.
 * @returns {Promise<ICompoundData[]>} A promise that resolves to an array of
 *     compound data objects.
 */
async function _getCompoundDataGivenCIDs(
    cids: number[]
): Promise<ICompoundData[]> {
    const batchSize = 100; // Arbitrary batch size (adjust based on PubChem's limits)
    const compoundData: ICompoundData[] = [];

    const defaultPropsToTry = [
        "CanonicalSMILES",
        "IsomericSMILES",
        "SMILES",
        "ConnectivitySMILES",
    ];

    let propsToTry = defaultPropsToTry.slice();

    for (let i = 0; i < cids.length; i += batchSize) {
        const batchCIDs = cids.slice(i, i + batchSize).join(",");

        let propData: any = undefined;
        let propToTry = "";

        for (propToTry of propsToTry) {
            try {
                const propUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${batchCIDs}/property/${propToTry}/JSON`;
                propData = await pubChemQueue.enqueue(propUrl);
                break;
            } catch {
                propsToTry = propsToTry.filter(
                    (prop) => prop !== propToTry
                );
                if (propsToTry.length === 0) {
                    propsToTry = defaultPropsToTry.slice();
                }
                continue;
            }
        }

        try {
            const propertiesList = propData?.PropertyTable?.Properties ?? [];
            for (const prop of propertiesList) {
                const smilesValue =
                    prop.CanonicalSMILES ||
                    prop.IsomericSMILES ||
                    prop.SMILES ||
                    prop.ConnectivitySMILES;
                // Desalt the smiles string. Using easyDesaltSMILES because it is fast,
                // though not as rigorous as converting to OpenBabel.
                compoundData.push({
                    CID: prop.CID,
                    // SMILES: easyDesaltSMILES(prop.CanonicalSMILES) ?? "N/A",
                    SMILES: easyDesaltSMILES(smilesValue) ?? "N/A",
                    sortMetric: 0,
                });
            }
        } catch {
            continue; // Skip this batch on failure
        }
    }

    return compoundData;
}

/**
 * A helper function that fetches extra CIDs for a given URL.
 *
 * @param {string} url         The URL to fetch the CIDs from.
 * @param {number} maxRecords  The maximum number of records to return.
 * @returns {Promise<number[]>} A promise that resolves to an array of CIDs.
 */
async function _fetchExtraCIDs(
    url: string,
    maxRecords: number
): Promise<number[]> {
    // NOTE: Request five times as many records as you will need. This is
    // because PubChem doesn't return the compounds in order of
    // similarity, so you will separately calculate similarity later and keep
    // the top ones. But I don't want to just get all the smiles, because that
    // seems wasteful/needlessly intense.
    const numToFetch = Math.min(maxRecords * 5, 1000);

    url = `${url}&MaxRecords=${numToFetch}`;

    try {
        const data = await pubChemQueue.enqueue(url);
        return data?.IdentifierList?.CID ?? [];
    } catch {
        return [];
    }
}

/**
 * A helper function that fetches compounds similar to the provided SMILES
 * string.
 *
 * @param {string} smiles        The SMILES string.
 * @param {number} [threshold]   The Tanimoto coefficient threshold. Default is
 *                               95.
 * @param {number} [maxRecords]  The max number of records to return. Default is
 *                               100.
 * @returns {Promise<any>} A promise that resolves to an object containing
 *     similar compounds or an error message.
 */
export async function fetchSimilarCompounds(
    smiles: string,
    threshold = 95,
    maxRecords = 100
): Promise<any> {
    // Request five times as many records as you will need. This is because
    // fastsimilarity_2d doesn't return the compounds in order of similarity, so
    // you will separately calculate similarity later and keep the top ones. But
    // I don't want to just get all the smiles, because that seems
    // wasteful/needlessly intense.

    // Stereochemistry (chirality and E/Z) is intentionally stripped before
    // querying PubChem. The fast 2D similarity index doesn't reliably
    // honor stereo, and ignoring it gives users a simpler, higher-recall
    // search for broader compounds. The UI tells the user this is
    // happening so the behavior isn't surprising.
    try {
        const cids = await _fetchExtraCIDs(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsimilarity_2d/smiles/${encodeURIComponent(
                easyStripStereoSMILES(smiles)
            )}/cids/JSON?Threshold=${threshold}`,
            maxRecords
        );

        if (cids.length === 0) {
            return {
                error: "No similar compounds found. Please adjust the threshold or check the SMILES input.",
            };
        }

        let compoundData = await _getCompoundDataGivenCIDs(cids);

        if (compoundData.length === 0) {
            return {
                error: "Failed to retrieve SMILES strings for the similar compounds.",
            };
        }

        // TODO: If you ever feel like this is taking too much on the main
        // thread, might consider moving it into a web worker.

        // The problem is that the compounds are not sorted by similarity. We'll
        // need to do that separately. Fortunately, rdkitjs provides this
        // functionalitty.
        const rdkitjs = await dynamicImports.rdkitjs.module;
        const queryMol = rdkitjs.get_mol(smiles);
        const queryFp = queryMol.get_morgan_fp_as_uint8array();

        for (const compound of compoundData) {
            const compoundMol = rdkitjs.get_mol(compound.SMILES);
            const compoundFp = compoundMol.get_morgan_fp_as_uint8array();
            compound.sortMetric = _calculateTanimotoSimilarity(
                queryFp,
                compoundFp
            );
        }

        // Sort by the score
        compoundData.sort((a, b) => b.sortMetric - a.sortMetric);

        // Remove ones with perfect scores (not wanting to just return same
        // molecules).
        compoundData = compoundData.filter((c) => c.sortMetric !== 1);

        // Remove ones with duplicate smiles. This can happen because of
        // differences in isotopes (not important for docking).
        compoundData = compoundData.filter(
            (compound, index, self) =>
                index === self.findIndex((c) => c.SMILES === compound.SMILES)
        );

        // Keep only top ones
        compoundData = compoundData.slice(0, maxRecords);

        return { "Similar Compounds": compoundData };
    } catch (error: any) {
        return { error: `Network issue occurred: ${error.message}` };
    }
}

/**
 * A helper function that fetches compounds containing the given SMILES as a
 * substructure.
 *
 * @param {string} smiles        The SMILES string.
 * @param {number} [maxRecords]  The max number of records to return. Default is
 *                               100.
 * @returns {Promise<any>} A promise that resolves to an object containing
 *     substructure compounds or an error message.
 */
export async function fetchSubstructureCompounds(
    smiles: string,
    maxRecords = 100
): Promise<any> {
    // See fetchSimilarCompounds for rationale on stripping stereochemistry.
    try {
        const cids = await _fetchExtraCIDs(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsubstructure/smiles/${encodeURIComponent(
                easyStripStereoSMILES(smiles)
            )}/cids/JSON?MatchIsotopes=false`,
            maxRecords
        );

        if (cids.length === 0) {
            return {
                error: "No substructure compounds found. Please check the SMILES input.",
            };
        }

        let compoundData = await _getCompoundDataGivenCIDs(cids);

        if (compoundData.length === 0) {
            return {
                error: "Failed to retrieve SMILES strings for the similar compounds.",
            };
        }

        const numAtomsQuery = easyCountHeavyAtomsSmiles(smiles);

        // You will want to propritize smaller compounds (nearby-superstructures).
        compoundData.forEach((c) => {
            c.sortMetric = easyCountHeavyAtomsSmiles(c.SMILES) - numAtomsQuery;
        });

        // Sort by the score
        compoundData.sort((a, b) => a.sortMetric - b.sortMetric);

        // Remove ones with perfect scores (not wanting to just return same
        // molecules).
        compoundData = compoundData.filter((c) => c.sortMetric > 0);

        // Remove ones with duplicate smiles. This can happen because of
        // differences in isotopes (not important for docking).
        compoundData = compoundData.filter(
            (compound, index, self) =>
                index === self.findIndex((c) => c.SMILES === compound.SMILES)
        );

        // Keep only top ones
        compoundData = compoundData.slice(0, maxRecords);

        return { "Substructure Compounds": compoundData };
    } catch (error: any) {
        return { error: `Network issue occurred: ${error.message}` };
    }
}

/**
 * A helper function that fetches compounds for which the given SMILES is a
 * superstructure.
 *
 * @param {string} smiles        The SMILES string.
 * @param {number} [maxRecords]  The max number of records to return. Default is
 *                               100.
 * @returns {Promise<any>} A promise that resolves to an object containing
 *     superstructure compounds or an error message.
 */
export async function fetchSuperstructureCompounds(
    smiles: string,
    maxRecords = 100
): Promise<any> {
    // See fetchSimilarCompounds for rationale on stripping stereochemistry.
    try {
        // https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest#section=Substructure-Superstructure
        const cids = await _fetchExtraCIDs(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsuperstructure/smiles/${encodeURIComponent(
                easyStripStereoSMILES(smiles)
            )}/cids/JSON?MatchIsotopes=false&ChainsMatchRings=false`,
            maxRecords
        );

        if (cids.length === 0) {
            return {
                error: "No superstructure compounds found. Please check the SMILES input.",
            };
        }

        let compoundData = await _getCompoundDataGivenCIDs(cids);

        if (compoundData.length === 0) {
            return {
                error: "Failed to retrieve SMILES strings for the similar compounds.",
            };
        }

        const numAtomsQuery = easyCountHeavyAtomsSmiles(smiles);

        // You will want to propritize smaller compounds (nearby-superstructures).
        compoundData.forEach((c) => {
            c.sortMetric = numAtomsQuery - easyCountHeavyAtomsSmiles(c.SMILES);
        });

        // Sort by the score
        compoundData.sort((a, b) => a.sortMetric - b.sortMetric);

        // Remove ones with perfect scores (not wanting to just return same
        // molecules).
        compoundData = compoundData.filter((c) => c.sortMetric > 0);

        // Remove ones with duplicate smiles. This can happen because of
        // differences in isotopes (not important for docking).
        compoundData = compoundData.filter(
            (compound, index, self) =>
                index === self.findIndex((c) => c.SMILES === compound.SMILES)
        );

        // Keep only top ones
        compoundData = compoundData.slice(0, maxRecords);

        return { "Superstructure Compounds": compoundData };
    } catch (error: any) {
        return { error: `Network issue occurred: ${error.message}` };
    }
}
