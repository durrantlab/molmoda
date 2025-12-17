import { fetcher, ResponseType } from "@/Core/Fetcher";
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
                // proteinFileInfo, // No longer used if we always pass sequence
                sequence,
                evalue,
                identity,
                maxResults,
                queryIdentifiers, // Now an array of strings
                query, // This is now the list of sources
                hasLigands, // Handled here now
            } = jobInfo.input;

            // Sequence is passed from the plugin after processing
            const proteinSequence = sequence;
            if (!proteinSequence) {
                throw new Error("No sequence provided in job input.");
            }

            // 2. Build the PDB API query
            const sequenceQuery = {
                type: "terminal",
                service: "sequence",
                parameters: {
                    evalue_cutoff: evalue,
                    identity_cutoff: identity,
                    sequence_type: "protein",
                    value: proteinSequence,
                },
            };

            let finalQuery: any = sequenceQuery;

            if (hasLigands) {
                const ligandQuery = {
                    type: "terminal",
                    service: "text",
                    parameters: {
                        attribute: "rcsb_entry_info.nonpolymer_entity_count",
                        operator: "greater",
                        value: 0,
                    },
                };

                finalQuery = {
                    type: "group",
                    logical_operator: "and",
                    nodes: [sequenceQuery, ligandQuery],
                };
            }

            // 3. Make the API call
            const apiQuery = {
                query: finalQuery,
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
                formPostData: apiQuery,
            });

            // Filter out the query proteins themselves from the results
            const filteredResults = results.result_set.filter(
                (item: any) => {
                    if (Array.isArray(queryIdentifiers)) {
                        return !queryIdentifiers.includes(item.identifier.toUpperCase());
                    }
                    // Fallback for single string (backward compatibility or error case)
                    return item.identifier.toUpperCase() !== String(queryIdentifiers).toUpperCase();
                }
            );

            // 4. Store the results in the job output
            jobInfo.output = {
                results: filteredResults,
                query: query,
            };
        } catch (e: any) {
            jobInfo.output = {
                error: e.message,
                query: jobInfo.input.query,
            };
        }
    }
}
