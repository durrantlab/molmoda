import { IHeader, ITableData } from "@/UI/Components/Table/Types";
import { PluginParentClass } from "./PluginParentClass/PluginParentClass";
import { FileInfo } from "@/FileSystem/FileInfo";
import { messagesApi } from "@/Api/Messages";
import {
    ITreeNodeData,
    TableHeaderSort,
    TreeNodeDataType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import {
    IUserArgAlert,
    IUserArgMoleculeInputParams,
    UserArg,
    UserArgType,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { QueueParent } from "@/Queue/QueueParent";
import { IJobInfo } from "@/Queue/QueueTypes";

/**
 * A class to handle the queue of jobs for getting properties. Supports two
 * execution modes:
 *
 *   1. Per-molecule (legacy): the parent plugin implements
 *      getMoleculeDetails(); PropertyQueue invokes it once per input.
 *   2. Bulk: the parent plugin implements getMoleculesDetailsBatch(); all
 *      inputs are passed through that method in a single call so the plugin
 *      can issue batched PubChem requests. The queue still emits progress
 *      ticks through a callback the bulk method invokes.
 */
class PropertyQueue extends QueueParent {
    private parent: GetPropPluginParent;

    /**
     * Creates a new PropertyQueue.
     *
     * @param {GetPropPluginParent} parent     The parent plugin.
     * @param {string}              jobTypeId  The job type ID.
     * @param {any[]}               inputs     The inputs for the jobs.
     * @param {any}                 callbacks  The callbacks for the jobs.
     */
    constructor(
        parent: GetPropPluginParent,
        jobTypeId: string,
        inputs: any[],
        callbacks?: any
    ) {
        const useBulk = parent.supportsBulk;
        const procsPerJobBatch = 1;
        const simulBatches = 1;
        const maxProcs = 1;
        // In bulk mode, hand all molecules to runJobBatch as a single batch
        // so the parent can issue chunked REST calls. In per-molecule mode,
        // keep the original size-1 batching so progress ticks fire per item.
        const batchSize = useBulk ? Math.max(inputs.length, 1) : 1;
        super(
            jobTypeId,
            inputs,
            maxProcs,
            callbacks,
            procsPerJobBatch,
            simulBatches,
            batchSize,
            true
        );
        this.parent = parent;
    }

    /**
     * Runs a batch of jobs. In bulk mode the whole batch is processed in one
     * shot by the parent's getMoleculesDetailsBatch; in per-molecule mode it
     * falls back to invoking runJobInBrowser per input.
     *
     * @param {IJobInfo[]} inputBatch  The batch of jobs to run.
     * @param {number}     procs       The number of processes to use.
     * @returns {Promise<IJobInfo[]>} The results of the jobs.
     */
    public async runJobBatch(
        inputBatch: IJobInfo[],
        procs: number
    ): Promise<IJobInfo[]> {
        void procs;
        if (this.parent.supportsBulk) {
            const mols = inputBatch.map((j) => j.input as FileInfo);
            // The parent reports progress as a fraction in [0, 1] across the
            // bulk pipeline (CID resolution + property fetches + synonyms,
            // etc.). We translate that to the queue store directly so the
            // bar can advance smoothly even though only one queue "batch"
            // is running.
            await this.parent.runBulkInBrowser(mols, (frac: number) => {
                this._onProgress(frac);
            });
            return inputBatch;
        }
        for (const jobInfo of inputBatch) {
            await this.parent.runJobInBrowser(jobInfo.input);
        }
        return inputBatch;
    }
}

/**
 * A class to handle the parent plugin for getting properties.
 */
export abstract class GetPropPluginParent extends PluginParentClass {
    resultsData: { [key: string]: any } = {};
    abstract dataSetTitle: string;

    userArgDefaults: UserArg[] = [
        {
            id: "makemolinputparams",
            val: new MoleculeInput({
                compoundFormat: "can",
                considerProteins: false,
                batchSize: null,
            }),
        } as IUserArgMoleculeInputParams,
        {
            id: "warning",
            type: UserArgType.Alert,
            val: "This process may take some time for multiple molecules. Check the Jobs panel to monitor progress. The data will be added to the Data panel once complete.",
            alertType: "warning",
        } as IUserArgAlert,
    ];

    /**
     * Whether this plugin implements the bulk-processing path. Subclasses
     * that override getMoleculesDetailsBatch should also override this to
     * return true; the default is false so existing per-molecule plugins
     * keep working unchanged.
     *
     * @returns {boolean}  True if bulk processing is supported.
     */
    public get supportsBulk(): boolean {
        return false;
    }

    /**
     * Gets the results array. This is aimply the values of the results data.
     *
     * @returns {any[]}  The results array.
     */
    get resultsArray(): any[] {
        return Object.values(this.resultsData);
    }

    /**
     * Called when the popup is done.
     *
     * @returns {Promise<void>|undefined}  A promise that resolves when the
     *     popup is done.
     */
    public onPopupDone(): Promise<void> | undefined {
        const molecules = this.getUserArg("makemolinputparams") as FileInfo[];

        if (molecules.length === 0) {
            messagesApi.popupError(
                "No molecules match the current selection criteria."
            );
            return undefined;
        }

        // Reset results data
        this.resultsData = {};

        // Create new queue with concrete class
        const queue = new PropertyQueue(this, this.pluginId, molecules, {
            /**
             * Called when the queue is completed.
             */
            onQueueDone: () => {
                // Show results in popup table when complete
                messagesApi.popupTableData(
                    `${this.title} Results`,
                    `Successfully retrieved data for ${molecules.length} compounds. The data have also been added to the Data panel.`,
                    this.formattedTableData,
                    "Results Summary",
                    3,
                    this.dataSetTitle
                );
            },
        });

        // Run jobs
        queue.done.catch((err) => {
            messagesApi.popupError(err.message); // TODO: Does throwing the error do the same thing? Redudant?
            throw err;
        });
    }

    abstract getMoleculeDetails(
        molFileInfo: FileInfo
    ): Promise<{ [key: string]: any } | undefined>;
    /**
     * Bulk variant of getMoleculeDetails. Override this when the underlying
     * service supports batched queries (e.g. PubChem property and synonym
     * endpoints accept comma-separated CIDs). The method receives every
     * selected molecule at once and is responsible for writing results into
     * each molecule's tree node and into this.resultsData, mirroring what
     * runJobInBrowser does in the per-molecule path. The onProgress callback
     * accepts a fraction in [0, 1] and may be called any number of times.
     *
     * @param {FileInfo[]} mols         The molecules to process.
     * @param {Function}   onProgress   Progress reporter (fraction in [0,1]).
     * @returns {Promise<void>}  Resolves when bulk processing finishes.
     */
    public async getMoleculesDetailsBatch(
        mols: FileInfo[],
        onProgress: (frac: number) => void
    ): Promise<void> {
        // Default implementation: fall back to per-molecule. Subclasses that
        // set supportsBulk = true should override this; this fallback exists
        // only as a safety net.
        void mols;
        void onProgress;
        throw new Error(
            "getMoleculesDetailsBatch not implemented; set supportsBulk=false or override."
        );
    }
    /**
     * Entry point used by PropertyQueue in bulk mode. Wraps
     * getMoleculesDetailsBatch with try/catch and standard logging so the
     * bulk path matches the safety of runJobInBrowser.
     *
     * @param {FileInfo[]} mols        The molecules to process.
     * @param {Function}   onProgress  Progress reporter.
     * @returns {Promise<void>}
     */
    public async runBulkInBrowser(
        mols: FileInfo[],
        onProgress: (frac: number) => void
    ): Promise<void> {
        try {
            await this.getMoleculesDetailsBatch(mols, onProgress);
        } catch (error: any) {
            // Mirror the per-molecule error-recording behaviour: record an
            // error row for every molecule that didn't get a result. This
            // keeps the results table populated even when a network failure
            // takes down the whole bulk call.
            for (const mol of mols) {
                if (!mol.treeNode) {
                    continue;
                }
                const pathName = mol.treeNode.descriptions.pathName(">", 50);
                if (this.resultsData[pathName]) {
                    continue;
                }
                console.error(
                    `Error getting properties for ${pathName}:`,
                    error
                );
                this.resultsData[pathName] = {
                    Compound: pathName,
                    error: error.message,
                };
            }
        }
    }
    /**
     * Gets the formatted table data with merged headers from all rows.
     *
     * @returns {ITableData} The formatted table data.
     */
    get formattedTableData(): ITableData {
        if (this.resultsArray.length === 0) {
            return { headers: [], rows: [] };
        }

        // Check if all results have errors
        const allErrors = this.resultsArray.every((result) => result.error);

        if (allErrors) {
            const headers: IHeader[] = [
                { text: "Name" },
                { text: "SMILES" },
                { text: "Error" },
            ];
            return {
                headers,
                rows: this.resultsArray.map((result) => ({
                    Name: result.name,
                    SMILES: result.smiles || "",
                    Error: result.error,
                })),
            };
        }

        // Get non-error results
        const validResults = this.resultsArray.filter(
            (result) => !result.error
        );

        // Collect all possible headers from all valid results
        const headerSet = new Set<string>();

        // First add all keys from valid results
        validResults.forEach((result) => {
            Object.keys(result).forEach((key) => {
                if (key !== "error") {
                    headerSet.add(key);
                }
            });
        });

        // Create headers array from the collected unique keys
        const headers: IHeader[] = Array.from(headerSet).map((key) => ({
            text: key,
            sortable: true,
            width: key === "name" ? 150 : undefined,
            note: `${key} from PubChem`,
        }));

        // Create rows with all possible fields, using "" for missing values
        const rows = validResults.map((result) => {
            const row: Record<string, any> = {};
            headerSet.forEach((key) => {
                row[key] = result[key] !== undefined ? result[key] : "";
            });
            return row;
        });

        return {
            headers,
            rows,
        };
    }

    /**
     * Helper used by both the per-molecule and bulk paths to record a result
     * row for a single molecule. Centralised so the tree-node update and the
     * resultsData entry stay in sync regardless of which path produced the
     * data.
     *
     * @param {FileInfo}                mol    The molecule processed.
     * @param {{[key: string]: any}}    props  The property map to record.
     */
    public recordMoleculeResult(
        mol: FileInfo,
        props: { [key: string]: any }
    ): void {
        if (!mol.treeNode) {
            return;
        }
        mol.treeNode.data = {
            ...mol.treeNode.data,
        };
        mol.treeNode.data[this.dataSetTitle] = {
            data: props,
            type: TreeNodeDataType.Table,
            treeNodeId: mol.treeNode.id,
            headerSort: TableHeaderSort.None,
        } as ITreeNodeData;
        const pathName = mol.treeNode.descriptions.pathName(">", 50);
        this.resultsData[pathName] = {
            name: pathName,
            ...props,
        };
    }

    /**
     * Runs a job in the browser.
     *
     * @param {FileInfo} mol  The molecule to run the job on.
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    async runJobInBrowser(mol: FileInfo): Promise<void> {
        let props: { [key: string]: any } | undefined;
        try {
            props = await this.getMoleculeDetails(mol);
        } catch (error: any) {
            if (mol.treeNode) {
                const pathName = mol.treeNode.descriptions.pathName(">", 50);
                console.error(
                    `Error getting properties for ${pathName}:`,
                    error
                );
                this.resultsData[pathName] = {
                    Compound: pathName,
                    error: error.message,
                };
            }
        }

        if (mol.treeNode && props) {
            this.recordMoleculeResult(mol, props);
        }
    }
}
