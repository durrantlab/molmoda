import { dynamicImports } from "../../../Core/DynamicImports";
import { RateLimitedFetcherQueue, ResponseType } from "../../../Core/Fetcher";
import {
    easyCountHeavyAtomsSmiles,
    easyDesaltSMILES,
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

/**
 * A helper function that fetches a CID from a SMILES string.
 *
 * @param {string} smiles The SMILES string of the compound.
 * @returns {Promise<string>} A promise that resolves to a CID or an error message.
 */
export async function fetchCid(smiles: string): Promise<string> {
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
 * A helper function that fetches active bioassays for a given CID.
 *
 * @param {string} cid The CID of the compound.
 * @returns {Promise<any>} A promise that resolves to an object containing active assays or an error message.
 */
export async function fetchActiveAssays(cid: string): Promise<any> {
    alert("Need to prioritize these somehow...")
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/assaysummary/JSON`;
    try {
        const data = await pubChemQueue.enqueue(url);

        const table = data?.Table ?? {};
        const columns = table?.Columns?.Column ?? [];
        const rows = table?.Row ?? [];

        const outcomeIndex = columns.indexOf("Activity Outcome");
        if (outcomeIndex === -1) {
            return { error: "Activity Outcome column not found in data." };
        }

        const activeAssays: any[] = [];
        for (const row of rows) {
            const cells = row?.Cell ?? [];
            if (cells[outcomeIndex] === "Active") {
                const assay: any = {};
                for (let i = 0; i < columns.length; i++) {
                    assay[columns[i]] = cells[i];
                }
                activeAssays.push(assay);
            }
        }

        if (activeAssays.length === 0) {
            return { error: "No active assays found for the provided CID." };
        }

        return { ActiveAssays: activeAssays };
    } catch (error: any) {
        return { error: `Network issue occurred: ${error.message}` };
    }
}

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

// Helper function to count the number of 1 bits in a byte
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

async function _getCompoundDataGivenCIDs(
    cids: number[]
): Promise<ICompoundData[]> {
    const batchSize = 100; // Arbitrary batch size (adjust based on PubChem's limits)
    const compoundData: ICompoundData[] = [];

    for (let i = 0; i < cids.length; i += batchSize) {
        const batchCIDs = cids.slice(i, i + batchSize).join(",");
        const propUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${batchCIDs}/property/CanonicalSMILES/JSON`;

        try {
            const propData = await pubChemQueue.enqueue(propUrl);

            const propertiesList = propData?.PropertyTable?.Properties ?? [];
            for (const prop of propertiesList) {
                // Desalt the smiles string. Using easyDesaltSMILES because it is fast,
                // though not as rigorous as converting to OpenBabel.
                compoundData.push({
                    CID: prop.CID,
                    SMILES: easyDesaltSMILES(prop.CanonicalSMILES) ?? "N/A",
                    sortMetric: 0,
                });
            }
        } catch {
            continue; // Skip this batch on failure
        }
    }

    return compoundData;
}

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
    } catch (error: any) {
        return [];
    }
}

/**
 * A helper function that fetches compounds similar to the provided SMILES string.
 *
 * @param {string} smiles The SMILES string.
 * @param {number} [threshold=95] The Tanimoto coefficient threshold.
 * @param {number} [maxRecords=100] The max number of records to return.
 * @returns {Promise<any>} A promise that resolves to an object containing similar compounds or an error message.
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

    try {
        const cids = await _fetchExtraCIDs(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsimilarity_2d/smiles/${encodeURIComponent(
                smiles
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
 * A helper function that fetches compounds containing the given SMILES as a substructure.
 *
 * @param {string} smiles The SMILES string.
 * @param {number} [maxRecords=100] The max number of records to return.
 * @returns {Promise<any>} A promise that resolves to an object containing substructure compounds or an error message.
 */
export async function fetchSubstructureCompounds(
    smiles: string,
    maxRecords = 100
): Promise<any> {
    try {
        const cids = await _fetchExtraCIDs(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsubstructure/smiles/${encodeURIComponent(
                smiles
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
 * A helper function that fetches compounds for which the given SMILES is a superstructure.
 *
 * @param {string} smiles The SMILES string.
 * @param {number} [maxRecords=100] The max number of records to return.
 * @returns {Promise<any>} A promise that resolves to an object containing superstructure compounds or an error message.
 */
export async function fetchSuperstructureCompounds(
    smiles: string,
    maxRecords = 100
): Promise<any> {
    try {
        const cids = await _fetchExtraCIDs(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsuperstructure/smiles/${encodeURIComponent(
                smiles
            )}/cids/JSON?MatchIsotopes=false`,
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
