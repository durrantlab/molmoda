import { fetcher, ResponseType } from "@/Core/Fetcher";
import { makeEasyParser } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser";
import { getOrderedResidueSequenceFromModel } from "@/UI/Panels/Information/InformationPanelUtils";
import { QueueParent } from "@/Queue/QueueParent";
import { IJobInfo } from "@/Queue/QueueTypes";

/**
 * A queue for finding similar proteins using the PDB API.
 */
export class FindSimilarProteinsQueue extends QueueParent {
    /**
     * Runs a batch of jobs to find similar proteins.
     *
     * @param {IJobInfo[]} inputBatch  The batch of jobs to run.
     * @param {number}  procs    The number of processors to use (not directly
     *         used for API calls but part of the interface).
     * @returns {Promise<IJobInfo[]>} The results of the jobs.
     */
    public async runJobBatch(
        inputBatch: IJobInfo[],
        procs: number
    ): Promise<IJobInfo[]> {
        const promises = inputBatch.map((jobInfo) =>
            this.runSingleJob(jobInfo)
        );
        await Promise.all(promises);
        return inputBatch; // jobInfo is modified in place
    }

    /**
     * Runs a single job to find similar proteins for one query protein.
     *
     * @param {IJobInfo} jobInfo The job to run.
     * @returns {Promise<void>} A promise that resolves when the job is complete.
     */
    private async runSingleJob(jobInfo: IJobInfo): Promise<void> {
        try {
            const {
                proteinFileInfo,
                evalue,
                identity,
                maxResults,
                queryPdbId,
            } = jobInfo.input;

            // 1. Get protein sequence
            const parser = makeEasyParser(proteinFileInfo);
            const sequenceInfo = await getOrderedResidueSequenceFromModel(
                parser.atoms
            );
            const sequence = sequenceInfo.map((r) => r.oneLetterCode).join("");
            if (!sequence) {
                throw new Error("Could not extract sequence from protein.");
            }

            // 2. Build the PDB API query
            const query = {
                query: {
                    type: "terminal",
                    service: "sequence",
                    parameters: {
                        evalue_cutoff: evalue,
                        identity_cutoff: identity,
                        sequence_type: "protein",
                        value: sequence,
                    },
                },
                return_type: "entry",
                request_options: {
                    paginate: {
                        start: 0,
                        rows: maxResults,
                    },
                    results_content_type: ["experimental"],
                    sort: [
                        {
                            sort_by: "score",
                            direction: "desc",
                        },
                    ],
                    scoring_strategy: "combined",
                },
            };

            // 3. Make the API call
            const PDB_SEARCH_API =
                "https://search.rcsb.org/rcsbsearch/v2/query";
            const results = await fetcher(PDB_SEARCH_API, {
                responseType: ResponseType.JSON,
                formPostData: query,
            });
            // Filter out the query protein itself from the results
            const filteredResults = results.result_set.filter(
                (item: any) =>
                    item.identifier.toUpperCase() !== queryPdbId.toUpperCase()
            );
            // 4. Store the results in the job output
            jobInfo.output = {
                results: filteredResults,
                query: proteinFileInfo.treeNode,
            };
        } catch (e: any) {
            jobInfo.output = {
                error: e.message,
                query: jobInfo.input.proteinFileInfo.treeNode,
            };
        }
    }
}
