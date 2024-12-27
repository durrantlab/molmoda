import { IHeader, ITableData } from "@/UI/Components/Table/Types";
import { PluginParentClass } from "./PluginParentClass/PluginParentClass"; 
import { FileInfo } from "@/FileSystem/FileInfo";
import { messagesApi } from "@/Api/Messages";
import { ITreeNodeData, TableHeaderSort, TreeNodeDataType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { IUserArgAlert, IUserArgMoleculeInputParams, UserArg, UserArgType } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { QueueParent } from "@/Queue/QueueParent";
import { IJobInfo } from "@/Queue/QueueTypes";

/**
 * A class to handle the queue of jobs for getting properties.
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
        const procsPerJobBatch = 1;
        const simulBatches = 1;  // To prevent too many rapid calls to PubChem
        const maxProcs = 1;  // To prevent too many rapid calls to PubChem
        const batchSize = 1;  // Process one ligand at a time
        super(jobTypeId, inputs, maxProcs, callbacks, procsPerJobBatch, simulBatches, batchSize, true);
        this.parent = parent;
    }

    /**
     * Runs a batch of jobs.
     *
     * @param {IJobInfo[]} inputBatch  The batch of jobs to run.
     * @param {number}     procs       The number of processes to use.
     * @returns {Promise<IJobInfo[]>} The results of the jobs.
     */
    public async runJobBatch(
        inputBatch: IJobInfo[],
        procs: number
    ): Promise<IJobInfo[]> {
        const results: IJobInfo[] = [];

        for (const jobInfo of inputBatch) {
            await this.parent.runJobInBrowser(jobInfo.input)
            
            // Below is just to keep track of number completed. Results are
            // added to the tree nodes as completed.
            results.push(jobInfo);
        }

        // Wait 250 miliseconds
        await new Promise((resolve) => setTimeout(resolve, 250));

        return results;
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
            messagesApi.popupError("No molecules match the current selection criteria.");
            return;
        }

        // Reset results data
        this.resultsData = {};

        // Create new queue with concrete class
        const queue = new PropertyQueue(
            this,
            this.pluginId,
            molecules,
            {
                onQueueDone: () => {
                    // Show results in popup table when complete
                    messagesApi.popupTableData(
                        `${this.title} Results`,
                        `Successfully retrieved data for ${molecules.length} compounds. The data have also been added to the Data panel.`,
                        this.formattedTableData,
                        "Results Summary",
                        3
                    );
                }
            }
        );

        // Run jobs
        queue.done.catch((err) => {
            messagesApi.popupError(err.message);  // TODO: Does throwing the error do the same thing? Redudant?
            throw err;
        });
    }

    abstract getMoleculeDetails(molFileInfo: FileInfo): Promise<{ [key: string]: any } | undefined>;

    /**
     * Gets the formatted table data.
     * 
     * @returns {ITableData}  The formatted table data.
     */
    get formattedTableData(): ITableData {
        if (this.resultsArray.length === 0) {
            return { headers: [], rows: [] };
        }

        const sampleResult = this.resultsArray.find((result) => !result.error);
        if (!sampleResult) {
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

        const headers: IHeader[] = Object.keys(sampleResult)
            .filter((key) => key !== "error")
            .map((key) => ({
                text: key,
                sortable: true,
                width: key === "name" ? 150 : undefined, 
                note: `${key} from PubChem`,
            }));

        return {
            headers,
            rows: this.resultsArray.filter((result) => !result.error),
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
    }
}