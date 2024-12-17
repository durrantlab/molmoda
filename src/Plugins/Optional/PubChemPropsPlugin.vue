<template>
  <PluginComponent
    v-model="open"
    :infoPayload="infoPayload"
    @onPopupDone="onPopupDone"
    actionBtnTxt="Get Properties"
    @onUserArgChanged="onUserArgChanged"
  >
    <Alert type="info" class="mt-3" v-if="numMoleculesToProcess > 0">
      Will process {{ numMoleculesToProcess }} molecule{{
        numMoleculesToProcess === 1 ? "" : "s"
      }}.
    </Alert>
    <!-- <Alert type="warning" class="mt-3" v-else>
      No molecules match the current selection criteria. Please adjust your
      selection.
    </Alert> -->

    <div class="progress mt-3" v-if="isProcessing">
      <div
        class="progress-bar"
        role="progressbar"
        :style="{ width: progressPercentage + '%' }"
        :aria-valuenow="progressPercentage"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        {{ progressPercentage }}%
      </div>
    </div>

    <div class="results-table mt-4" v-if="showResults">
      <h6>Results Summary</h6>
      <div class="table-responsive">
        <table class="table table-sm table-hover">
          <thead>
            <tr>
              <th v-for="header in tableHeaders" :key="header">{{ header }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="result in resultsArray" :key="result.name">
              <template v-if="result.error">
                <td>{{ result.name }}</td>
                <td class="text-monospace small">{{ result.smiles }}</td>
                <td colspan="4" class="text-danger">{{ result.error }}</td>
              </template>
              <template v-else>
                <td v-for="header in tableHeaders" :key="header">
                  {{ result[header] }}
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </PluginComponent>
</template>

<script lang="ts">
import { fetchCompoundsProperties, fetchCid } from "../../pubchem_test";
import { checkCompoundLoaded } from "@/Plugins/Core/CheckUseAllowedUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
  IContributorCredit,
  ISoftwareCredit,
  Licenses,
} from "@/Plugins/PluginInterfaces";
import {
  UserArg,
  UserArgType,
  IUserArgAlert,
  IUserArgMoleculeInputParams,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import Alert from "@/UI/Layout/Alert.vue";
import { Options } from "vue-class-component";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import {
  TreeNodeType,
  ITreeNodeData,
  TableHeaderSort,
  TreeNodeDataType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import * as api from "@/Api";
import { Tag } from "@/Plugins/Tags/Tags";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import { FileInfo } from "@/FileSystem/FileInfo";

@Options({
  components: {
    PluginComponent,
    Alert,
  },
})
export default class PubChemPropsPlugin extends PluginParentClass {
  menuPath = "Compounds/Get PubChem Properties...";
  title = "Get PubChem Properties";
  softwareCredits: ISoftwareCredit[] = [
    {
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
    },
  ];

  contributorCredits: IContributorCredit[] = [];
  pluginId = "pubchemprops";
  tags = [Tag.All];
  intro =
    "Get properties, descriptions and synonyms from PubChem for selected compounds.";
  details =
    "Uses the PubChem REST API to retrieve information about compounds based on their SMILES strings.";

  // Component state
  resultsData: { [key: string]: any } = {};
  isProcessing = false;
  processedCount = 0;
  totalToProcess = 0;
  showResults = false;

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
      val: "This process may take several minutes for multiple compounds. The properties will be added to the Data panel once complete.",
      alertType: "warning",
    } as IUserArgAlert,
  ];

  async runJobInBrowser(): Promise<void> {
    return Promise.resolve();
  }

  get numMoleculesToProcess(): number {
    const molecules = this.getUserArg("makemolinputparams") as TreeNode[];
    return molecules.length;
  }

  get progressPercentage(): number {
    if (this.totalToProcess === 0) return 0;
    return Math.round((this.processedCount / this.totalToProcess) * 100);
  }

  get resultsArray(): any[] {
    return Object.values(this.resultsData);
  }

  get tableHeaders(): string[] {
    if (this.resultsArray.length === 0) return [];

    // Get the first non-error result to determine headers
    const sampleResult = this.resultsArray.find((result) => !result.error);
    if (!sampleResult) return ["Name", "SMILES", "Error"];

    return Object.keys(sampleResult).filter((key) => key !== "error");
  }

  checkPluginAllowed(): string | null {
    return checkCompoundLoaded();
  }

  async getMoleculeDetails(molFileInfo: FileInfo): Promise<void> {
    // Add data to Data panel
    if (!molFileInfo.treeNode) {
      return;
    }

    try {
      const smiles = molFileInfo.contents.split(" ")[0].split("\t")[0];
      const cid = await fetchCid(smiles);
      if (cid.startsWith("Error")) {
        throw new Error(cid);
      }
      const properties = await fetchCompoundsProperties(cid);

      properties["CID"] = cid;

      molFileInfo.treeNode.data = {
        ...molFileInfo.treeNode.data,
        "PubChem Properties": {
          data: properties,
          type: TreeNodeDataType.Table,
          treeNodeId: molFileInfo.treeNode.id,
          headerSort: TableHeaderSort.None,
        } as ITreeNodeData,
      };

      // Store results for table display
      this.resultsData[molFileInfo.treeNode.title] = {
        name: molFileInfo.treeNode.title,
        ...properties,
      };
    } catch (error: any) {
      console.error(
        `Error getting properties for ${molFileInfo.treeNode.title}:`,
        error
      );
      this.resultsData[molFileInfo.treeNode.title] = {
        name: molFileInfo.treeNode.title,
        error: error.message,
      };
    }

    this.processedCount++;
  }

  async onPopupDone(): Promise<void> {
    const molecules = this.getUserArg("makemolinputparams") as FileInfo[];

    if (molecules.length === 0) {
      api.messages.popupError(
        "No molecules match the current selection criteria."
      );
      return;
    }

    // Reset state
    this.isProcessing = true;
    this.processedCount = 0;
    this.totalToProcess = molecules.length;
    this.resultsData = {};
    this.showResults = false;

    // Process each molecule
    const promises = [];
    for (const mol of molecules) {
      promises.push(this.getMoleculeDetails(mol));
    }

    await Promise.all(promises);

    this.isProcessing = false;
    this.showResults = true;

    // Create dynamic HTML table for popup
    let tableHtml = `
    <div class="table-responsive">
      <table class="table table-sm table-hover">
        <thead>
          <tr>
            ${this.tableHeaders.map((header) => `<th>${header}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
    `;

    for (const result of this.resultsArray) {
      if (!result.error) {
        tableHtml += `
          <tr>
            ${this.tableHeaders
              .map((header) => `<td>${result[header]}</td>`)
              .join("")}
          </tr>
        `;
      }
    }

    tableHtml += `
        </tbody>
      </table>
    </div>
    `;

    const message = `
      <p>Successfully retrieved properties for ${this.processedCount} compounds.</p>
      <p>The properties have been added to the Data panel. Here's a summary:</p>
      ${tableHtml}
    `;

    api.messages.popupMessage(
      "PubChem Properties Retrieved",
      message,
      PopupVariant.Success
    );
  }

  async getTests(): Promise<ITest> {
    return {
      beforePluginOpens: new TestCmdList().loadExampleMolecule(),
      afterPluginCloses: new TestCmdList().waitUntilRegex(
        "#data",
        "PubChem Properties"
      ),
    };
  }
}
</script>

<style scoped lang="scss">
.results-table {
  max-height: 400px;
  overflow-y: auto;

  table {
    thead th {
      position: sticky;
      top: 0;
      background: white;
      z-index: 1;
    }
  }
}

.text-monospace {
  font-family: monospace;
}

.progress {
  height: 1.5rem;
}

.table-responsive {
  max-height: 400px;
  overflow-y: auto;
}
</style>