import { IHeader, ITableData } from "@/UI/Components/Table/Types";
import { PluginParentClass } from "./PluginParentClass/PluginParentClass"; 
import { FileInfo } from "@/FileSystem/FileInfo";
import { messagesApi } from "@/Api/Messages";
import { TestCmdList } from "@/Testing/TestCmdList";
import { ITest } from "@/Testing/TestCmd";
import { ITreeNodeData, TableHeaderSort, TreeNodeDataType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { IUserArgAlert, IUserArgMoleculeInputParams, UserArg, UserArgType } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { QueueParent } from "@/Queue/QueueParent";
import { IJobInfo } from "@/Queue/QueueTypes";

// Concrete queue class
class PropertyQueue extends QueueParent {
    private parent: GetPropPluginParent;

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

    get resultsArray(): any[] {
        return Object.values(this.resultsData);
    }

    public onPopupDone(): void | Promise<void> {
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
            messagesApi.popupError(err.message);
        });
    }

    abstract getMoleculeDetails(molFileInfo: FileInfo): Promise<{ [key: string]: any } | undefined>;

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

    async runJobInBrowser(mol: FileInfo): Promise<void> {
        let props: { [key: string]: any } | undefined;
        try {
            props = await this.getMoleculeDetails(mol);
        } catch (error: any) {
            if (mol.treeNode) {
                console.error(
                    `Error getting properties for ${mol.treeNode.title}:`,
                    error
                );
                this.resultsData[mol.treeNode.title] = {
                    Compound: mol.treeNode.title,
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

            this.resultsData[mol.treeNode.title] = {
                name: mol.treeNode.title,
                ...props,
            };
        }
    }

    async getTests(): Promise<ITest> {
        return {
            beforePluginOpens: new TestCmdList().loadExampleMolecule(),
            afterPluginCloses: new TestCmdList().waitUntilRegex(
                "#data",
                "PubChem"
            ),
        };
    }
}