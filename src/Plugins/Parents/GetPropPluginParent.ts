import { IHeader, ITableData } from "@/UI/Components/Table/Types";
import { PluginParentClass } from "./PluginParentClass/PluginParentClass";
import { FileInfo } from "@/FileSystem/FileInfo";
import { messagesApi } from "@/Api/Messages";
import { TestCmdList } from "@/Testing/TestCmdList";
import { ITest } from "@/Testing/TestCmd";
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

export abstract class GetPropPluginParent extends PluginParentClass {
    // Component state
    resultsData: { [key: string]: any } = {};
    // isProcessing = false;
    processedCount = 0;
    totalToProcess = 0;

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
            val: "This process may take some time for multiple molecules. The data will be added to the Data panel once complete.",
            alertType: "warning",
        } as IUserArgAlert,
    ];

    get resultsArray(): any[] {
        return Object.values(this.resultsData);
    }

    public onPopupDone(): void | Promise<void> {
        // Get molecules from user args using parameterSet if provided
        const molecules = this.getUserArg("makemolinputparams") as FileInfo[];

        if (molecules.length === 0) {
            messagesApi.popupError(
                "No molecules match the current selection criteria."
            );
            return;
        }

        // Reset state
        // this.isProcessing = true;
        this.processedCount = 0;
        this.totalToProcess = molecules.length;
        this.resultsData = {};

        this.submitJobs(molecules.slice(0, 1));
    }

    abstract getMoleculeDetails(
        molFileInfo: FileInfo
    ): Promise<{ [key: string]: any } | undefined>;

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
        // // Get molecules from user args using parameterSet if provided
        // const molecules = (parameterSet?.molecules ||
        //     this.getUserArg("makemolinputparams")) as FileInfo[];

        // if (molecules.length === 0) {
        //     messagesApi.popupError(
        //         "No molecules match the current selection criteria."
        //     );
        //     return;
        // }

        // // Reset state
        // this.isProcessing = true;
        // this.processedCount = 0;
        // this.totalToProcess = molecules.length;
        // this.resultsData = {};

        // Process each molecule
        let props: { [key: string]: any } | undefined;
        try {
            props = await this.getMoleculeDetails(mol);
        } catch (error: any) {
            if (mol.treeNode) {
                console.error(
                    `Error getting bioassays for ${mol.treeNode.title}:`,
                    error
                );
                this.resultsData[mol.treeNode.title] = {
                    Compound: mol.treeNode.title,
                    error: error.message,
                };
            }
        }

        this.processedCount++;

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
                // smiles,
                ...props,
            };
        }

        debugger

        // this.isProcessing = false;

        // Show results in popup table
        // messagesApi.popupTableData(
        //     `${this.title} Results`,
        //     `Successfully retrieved data for ${this.processedCount} compounds. The data have also been added to the Data panel.`,
        //     this.formattedTableData,
        //     "Results Summary",
        //     3
        // );
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
