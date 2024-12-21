import { fetcher, ResponseType } from "./Core/Fetcher";

/**
 * A class to manage queued API calls with delays
 */
class ApiQueue {
    private queue: Array<() => Promise<any>> = [];
    private isProcessing = false;
    private delayMs: number;

    constructor(delayMs = 0) {
        this.delayMs = delayMs;
    }

    /**
     * Add a function to the queue
     * @param fn The async function to be queued
     * @returns Promise that resolves with the function's result
     */
    public enqueue<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
            
            this.processQueue();
        });
    }

    /**
     * Process the queue with delays between each call
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const fn = this.queue.shift();
            if (fn) {
                try {
                    await fn();
                } catch (error) {
                    console.error('Error processing queue item:', error);
                }
                
                // Wait for the specified delay before processing the next item
                await new Promise(resolve => setTimeout(resolve, this.delayMs));
            }
        }

        this.isProcessing = false;
    }

    /**
     * Get the current queue length
     */
    public get length(): number {
        return this.queue.length;
    }

    /**
     * Clear the queue
     */
    public clear(): void {
        this.queue = [];
    }
}

// Create a singleton instance for PubChem API calls
const pubChemQueue = new ApiQueue(0);  // 0ms delay between calls

// Modified fetcher function that uses the queue
async function queuedFetcher(url: string, options: { responseType: ResponseType }): Promise<any> {
    return pubChemQueue.enqueue(() => fetcher(url, options));
}

/**
 * A helper function that fetches a CID from a SMILES string.
 *
 * @param {string} smiles The SMILES string of the compound.
 * @returns {Promise<string>} A promise that resolves to a CID or an error message.
 */
export async function fetchCid(smiles: string): Promise<string> {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/cids/JSON`;
    try {
        const data = await queuedFetcher(url, { responseType: ResponseType.JSON });
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
export async function fetchMoleculeDetails(cid: string): Promise<any> {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/description/JSON`;
    try {
        const data = await queuedFetcher(url, { responseType: ResponseType.JSON });
        const informationList = data?.InformationList?.Information ?? [];
        const results: any[] = [];

        for (const info of informationList) {
            const details: any = {
                CID: info?.CID ?? "N/A"
            };
            const description = info?.Description;
            const source = info?.DescriptionSourceName;
            const infoUrl = info?.DescriptionURL;

            if (description) {
              details.Description = description;
            }
            if (source) {
              details.Source = source;
            }
            if (infoUrl) {
              details.URL = infoUrl;
            }

            results.push(details);
        }

        return results.length > 0 ? results : [{ "error": "No information available for the given CID." }];
    } catch (error: any) {
        return { "error": `Network issue occurred: ${error.message}` };
    }
}

/**
 * A helper function that fetches patent information for a given CID.
 *
 * @param {string} cid The CID of the compound.
 * @returns {Promise<any>} A promise that resolves to an object containing patent data or an error message.
 */
// async function fetchPatents(cid: string): Promise<any> {
//     const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/PatentCount,PatentFamilyCount/JSON`;
//     try {
//         const data = await queuedFetcher(url, { responseType: ResponseType.JSON });
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
        const data = await queuedFetcher(url, { responseType: ResponseType.JSON });
        const descriptions = data?.InformationList?.Information ?? [{}];
        if (descriptions.length > 0) {
            const synonyms = descriptions[0];
            return { "Synonyms": synonyms?.Synonym ?? "No Synonyms available" };
        } else {
            return { "error": "No synonyms available" };
        }
    } catch (error: any) {
        return { "error": `Failed to retrieve synonyms due to network issue: ${error.message}` };
    }
}

/**
 * A helper function that fetches various properties for a given CID.
 *
 * @param {string} cid The CID of the compound.
 * @returns {Promise<any>} A promise that resolves to an object containing compound properties or an error message.
 */
export async function fetchCompoundsProperties(cid: string): Promise<any> {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/` +
        "MolecularFormula,MolecularWeight," +
        "IUPACName,XLogP,ExactMass,TPSA,Complexity,Charge," +
        "HBondDonorCount,HBondAcceptorCount,RotatableBondCount,HeavyAtomCount," +
        "AtomStereoCount," +
        "BondStereoCount,CovalentUnitCount," +
        "Volume3D/JSON"
    try {
        const data = await queuedFetcher(url, { responseType: ResponseType.JSON });
        const properties = data?.PropertyTable?.Properties ?? [];
        if (properties.length > 0) {
            const prop = properties[0];
            const result: { [key: string]: any } = {
                "Formula": prop?.MolecularFormula ?? "N/A",
                "Weight": prop?.MolecularWeight ?? "N/A",
                "IUPAC Name": prop?.IUPACName ?? "N/A",
                "XLogP": prop?.XLogP ?? "N/A",
                "Exact Mass": prop?.ExactMass ?? "N/A",
                "TPSA": prop?.TPSA ?? "N/A",
                "Complexity": prop?.Complexity ?? "N/A",
                "Charge": prop?.Charge ?? "N/A",
                "HBD": prop?.HBondDonorCount ?? "N/A",
                "HBA": prop?.HBondAcceptorCount ?? "N/A",
                "Rot Bonds": prop?.RotatableBondCount ?? "N/A",
                "Heavy Atoms": prop?.HeavyAtomCount ?? "N/A",
                "Atom Stereos": prop?.AtomStereoCount ?? "N/A",
                "Bond Stereos": prop?.BondStereoCount ?? "N/A",
                // "Covalent Unit Count": prop?.CovalentUnitCount ?? "N/A",
                "Volume (3D)": prop?.Volume3D ?? "N/A",
            };
            return result;
        } else {
            return { "error": "No properties found for the provided CID" };
        }
    } catch (error: any) {
        return { "error": `Failed to retrieve properties due to network issue: ${error.message}` };
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
//         const data = await queuedFetcher(url, { responseType: ResponseType.JSON });

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
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/assaysummary/JSON`;
    try {
        const data = await queuedFetcher(url, { responseType: ResponseType.JSON });

        const table = data?.Table ?? {};
        const columns = table?.Columns?.Column ?? [];
        const rows = table?.Row ?? [];

        const outcomeIndex = columns.indexOf("Activity Outcome");
        if (outcomeIndex === -1) {
            return { "error": "Activity Outcome column not found in data." };
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
            return { "error": "No active assays found for the provided CID." };
        }

        return { "ActiveAssays": activeAssays };
    } catch (error: any) {
        return { "error": `Network issue occurred: ${error.message}` };
    }
}

/**
 * A helper function that "saves" file data by logging it. In a browser environment
 * we cannot write directly to the file system. Adjust as needed.
 *
 * @param {any} result The data to save.
 * @param {string} [filename="compound_data.json"] The filename to associate with the saved data.
 * @returns {void}
 */
function saveFile(result: any, filename = "compound_data.json"): void {
    console.log(`Data that would be saved to ${filename}:`, result);
}

/**
 * A helper function that fetches compounds similar to the provided SMILES string.
 *
 * @param {string} smiles The SMILES string.
 * @param {number} [threshold=95] The Tanimoto coefficient threshold.
 * @param {number} [maxRecords=100] The max number of records to return.
 * @returns {Promise<any>} A promise that resolves to an object containing similar compounds or an error message.
 */
async function fetchSimilarCompounds(smiles: string, threshold = 95, maxRecords = 100): Promise<any> {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsimilarity_2d/smiles/${encodeURIComponent(smiles)}/cids/JSON?Threshold=${threshold}&MaxRecords=${maxRecords}`;
    try {
        const data = await queuedFetcher(url, { responseType: ResponseType.JSON });
        const cids = data?.IdentifierList?.CID ?? [];
        if (cids.length === 0) {
            return { "error": "No similar compounds found. Please adjust the threshold or check the SMILES input." };
        }

        const batchSize = 100; // Arbitrary batch size (adjust based on PubChem's limits)
        const compoundData: { CID: number; SMILES: string }[] = [];

        for (let i = 0; i < cids.length; i += batchSize) {
            const batchCIDs = cids.slice(i, i + batchSize).join(",");
            const propUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${batchCIDs}/property/CanonicalSMILES/JSON`;

            try {
                const propData = await queuedFetcher(propUrl, { responseType: ResponseType.JSON });
                const propertiesList = propData?.PropertyTable?.Properties ?? [];
                for (const prop of propertiesList) {
                    compoundData.push({
                        CID: prop.CID,
                        SMILES: prop.CanonicalSMILES ?? "N/A"
                    });
                }
            } catch {
                continue; // Skip this batch on failure
            }
        }

        if (compoundData.length > 0) {
            return { "Similar Compounds": compoundData };
        } else {
            return { "error": "Failed to retrieve SMILES strings for the similar compounds." };
        }
    } catch (error: any) {
        return { "error": `Network issue occurred: ${error.message}` };
    }
}

/**
 * A helper function that fetches compounds containing the given SMILES as a substructure.
 *
 * @param {string} smiles The SMILES string.
 * @param {number} [maxRecords=100] The max number of records to return.
 * @returns {Promise<any>} A promise that resolves to an object containing substructure compounds or an error message.
 */
async function fetchSubstructureCompounds(smiles: string, maxRecords = 100): Promise<any> {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsubstructure/smiles/${encodeURIComponent(smiles)}/cids/JSON?MatchIsotopes=true&MaxRecords=${maxRecords}`;
    try {
        const data = await queuedFetcher(url, { responseType: ResponseType.JSON });
        const cids = data?.IdentifierList?.CID ?? [];
        if (cids.length > 0) {
            return { "Substructure Compounds": cids };
        } else {
            return { "error": "No substructure compounds found. Please check the SMILES input." };
        }
    } catch (error: any) {
        return { "error": `Network issue occurred: ${error.message}` };
    }
}

/**
 * A helper function that fetches compounds for which the given SMILES is a superstructure.
 *
 * @param {string} smiles The SMILES string.
 * @param {number} [maxRecords=100] The max number of records to return.
 * @returns {Promise<any>} A promise that resolves to an object containing superstructure compounds or an error message.
 */
async function fetchSuperstructureCompounds(smiles: string, maxRecords = 100): Promise<any> {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsuperstructure/smiles/${encodeURIComponent(smiles)}/cids/JSON?MatchIsotopes=true&MaxRecords=${maxRecords}`;
    try {
        const data = await queuedFetcher(url, { responseType: ResponseType.JSON });
        const cids = data?.IdentifierList?.CID ?? [];
        if (cids.length > 0) {
            return { "Superstructure Compounds": cids };
        } else {
            return { "error": "No superstructure compounds found. Please check the SMILES input." };
        }
    } catch (error: any) {
        return { "error": `Network issue occurred: ${error.message}` };
    }
}

/**
 * The main function to interactively fetch and display data about a compound based on a SMILES string.
 *
 * @returns {Promise<void>} A promise that resolves when the data has been fetched and displayed.
 */
// export async function mainPubChemTest(): Promise<void> {
//     const smiles = (prompt("Enter the SMILES of your choice:")?.trim() || "");
//     let threshold = (prompt("Enter the Tanimoto coefficient threshold (default is 95):")?.trim() || "95");
//     if (!/^\d+$/.test(threshold)) {
//         threshold = "95";
//     }

//     const cid = await fetchCid(smiles);
//     if (cid.startsWith("Error")) {
//         console.log(cid);
//         return;
//     }

//     const description = await fetchMoleculeDetails(cid);
//     const properties = await fetchCompoundsProperties(cid);
//     const synonyms = await fetchSynonyms(cid);
//     // const safetyInfo = await fetchHazardInformation(cid);
//     const bioassayData = await fetchActiveAssays(cid);
//     const similarCompounds = await fetchSimilarCompounds(smiles, parseInt(threshold, 10));
//     const substructureCompounds = await fetchSubstructureCompounds(smiles);
//     const superstructureCompounds = await fetchSuperstructureCompounds(smiles);

//     const combinedData = {
//         "Description": description,
//         "Properties": properties,
//         "Synonyms": synonyms,
//         // "Safety Information": safetyInfo,
//         "Bioassay Data": bioassayData,
//         "Similar Compounds": similarCompounds,
//         "Substructure Compounds": substructureCompounds,
//         "Superstructure Compounds": superstructureCompounds
//     };

//     saveFile(combinedData);
// }
