<template>
  <span>
    <h5>Data: Visible/Selected Molecules</h5>

    <p v-if="allTableData.length === 0" style="font-size: 14px">
      No molecules (visible or selected) have data to display.
    </p>
    <div v-else class="mb-3">
      <p style="font-size: 14px" class="mb-2">Use these toggle buttons to indicate the data to display in the table
        below:</p>
      <div class="d-flex flex-wrap gap-2">
        <!-- Add unique ID to connect input and label -->
        <div v-for="tableData in allTableData" :key="tableData[0]">
          <input type="checkbox" :id="'btn-check-' + tableData[0]" :value="tableData[0]" v-model="selectedSources"
            class="btn-check" autocomplete="off" />
          <label :for="'btn-check-' + tableData[0]" class="btn btn-outline-primary btn-sm">
            {{ tableData[0] }}
          </label>
        </div>
      </div>
    </div>

    <Table v-if="mergedTableData !== null" id="merged-data" :tableData="mergedTableData" caption="All Molecular Data"
      :noFixedTable="true" @rowClicked="rowClicked" :clickableRows="true">
    </Table>
  </span>
</template>

<script lang="ts">
/* eslint-disable no-unreachable */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";

import Table from "@/UI/Components/Table/Table.vue";
import {
  CellValue,
  ICellValue,
  IHeader,
  ITableData,
} from "@/UI/Components/Table/Types";
import {
  TreeNodeDataType,
  ITreeNodeData,
  TableHeaderSort,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { selectProgramatically } from "@/UI/Navigation/TitleBar/MolSelecting";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import FormSelectRegion from "@/UI/Forms/FormSelectRegion/FormSelectRegion.vue";
import { slugify } from "@/Core/Utils/StringUtils";

/**
 * DataPanel component
 */
@Options({
  components: {
    Table,
    FormSelectRegion,
  },
})
export default class DataPanel extends Vue {
  public test = null;

  /** Track both selected and known sources */
  private selectedSourcesArr: string[] | null = null;
  private knownSources: Set<string> = new Set();
  private initialized = false;

  /**
   * Get the selected data sources.
   * 
   * @returns {string[]}  The selected sources.
   */
  get selectedSources(): string[] {
    const allSources = this.allTableData.map(([source]) => source);

    // Initialize on first load
    if (!this.initialized && allSources.length > 0) {
      this.selectedSourcesArr = [...allSources];
      this.knownSources = new Set(allSources);
      this.initialized = true;
      return this.selectedSourcesArr;
    }

    // Handle subsequent updates
    if (this.selectedSourcesArr) {
      // Find genuinely new sources by comparing against known sources
      const newSources = allSources.filter(
        (source) => !this.knownSources.has(source)
      );

      // Add new sources to both selected and known
      if (newSources.length > 0) {
        this.selectedSourcesArr = [...this.selectedSourcesArr, ...newSources];
        newSources.forEach((source) => this.knownSources.add(source));
      }

      // Filter out removed sources
      this.selectedSourcesArr = this.selectedSourcesArr.filter((source) =>
        allSources.includes(source)
      );

      return this.selectedSourcesArr;
    }

    return [];
  }

  /**
   * Update selected sources when checkboxes are clicked.
   */
  set selectedSources(value: string[]) {
    this.selectedSourcesArr = value;
  }

  /**
   * Whether the table should be allowed to wrap text.
   *
   * @returns {boolean}  Whether the table should be allowed to wrap text.
   */
  noFixedTable(/* tableData: ITableData */): boolean {
    // In the past I allowed text wrapping if there were more than 5 columns
    // to try to make it more readable, but I've come to prefer never
    // wrapping.
    // return tableData.headers.length > 5;
    return true;
  }

  /**
   * Get the merged table data.
   *
   * @returns {ITableData | null}  The merged table data. Null if no data.
   */
  get mergedTableData(): ITableData | null {
    if (this.allTableData.length === 0 || this.selectedSources.length === 0) { return null; }

    // Filter the table data to only include selected sources
    const filteredTableData = this.allTableData.filter(([source]) =>
      this.selectedSources.includes(source)
    );

    // Initialize headers with Entry and id
    const headers = [
      { text: "Entry" },
      { text: "id", showColumnFunc: () => false },
    ];

    // Collect all unique entries (molecule paths + ids)
    const entries = new Set<string>();

    // First pass: collect all headers and entries
    filteredTableData.forEach(([source, tableData]) => {
      tableData.rows.forEach((row: { [key: string]: CellValue }) => {
        // const entry = (row.Entry as string) + "||>>" + row.id;
        const entry = JSON.stringify([(row.Entry as string), row.id]);
        entries.add(entry);

        // Add source-prefixed headers for all columns except Entry and id
        tableData.headers.forEach((header: IHeader) => {
          const headerText = header.text;
          if (headerText !== "Entry" && headerText !== "id") {
            const combinedHeader = {
              text: `${source}: ${headerText}`,
            };
            if (!headers.some((h) => h.text === combinedHeader.text)) {
              headers.push(combinedHeader);
            }
          }
        });
      });
    });

    // Build rows
    const rows: { [key: string]: CellValue }[] = Array.from(entries).map(
      (entry) => {
        const [entryName, id] = JSON.parse(entry) as string[];
        const row: { [key: string]: CellValue } = {
          Entry: { val: entryName } as ICellValue,
          id: { val: id } as ICellValue,
        };

        // Initialize all cells with empty values
        headers.forEach((header) => {
          if (header.text !== "Entry" && header.text !== "id") {
            row[header.text] = { val: "" } as ICellValue;
          }
        });

        // Fill in the data
        filteredTableData.forEach(([source, tableData]) => {
          const sourceRow = tableData.rows.find(
            (r: { [key: string]: CellValue }) => r.Entry === entryName && r.id === id // + "||>>" + r.id === entry
          );
          if (sourceRow) {
            tableData.headers.forEach((header: IHeader) => {
              const headerText = header.text;
              if (headerText !== "Entry" && headerText !== "id") {
                const combinedHeader = `${source}: ${headerText}`;
                const value = sourceRow[headerText];
                if (value !== undefined) {
                  row[combinedHeader] = {
                    val: value as string | number,
                  } as ICellValue;
                }
              }
            });
          }
        });

        return row;
      }
    );

    // Sort rows by Entry
    rows.sort((a, b) => {
      const aEntry = (a.Entry as ICellValue).val as string;
      const bEntry = (b.Entry as ICellValue).val as string;
      return aEntry.localeCompare(bEntry);
    });

    return {
      headers,
      rows,
    };
  }

  /**
   * Get the data for the table.
   *
   * @returns {any}  The data for the table.
   */
  get allTableData(): any[] {
    // { [key: string]: ITableData }
    const allMols = this.$store.state.molecules as TreeNodeList;

    // Note that below is only to ensure reactivity. Very hackish.
    if (allMols.triggerId === "-1") return [];

    // First get all the visible or selected nodes.
    // const nodes = allMols.flattened.filter(
    //   // mol_filter_ok
    //   (x: TreeNode) => x.visible || x.selected !== SelectedType.False
    // );

    // NOTE: I changed my mind. Data for all ligands should be shown, not just
    // visible or selected ones.
    const nodes = allMols.flattened;

    const dataByTableTitle: { [key: string]: ITreeNodeData[] } = {};
    for (let idx = 0; idx < nodes.length; idx++) {
      let node = nodes.get(idx);
      if (node.data === undefined) continue;
      const tableTitles = Object.keys(node.data);
      tableTitles.sort();

      for (const tableTitle of tableTitles) {
        const data = node.data[tableTitle];
        if (dataByTableTitle[tableTitle] === undefined) {
          dataByTableTitle[tableTitle] = [];
        }
        dataByTableTitle[tableTitle].push({
          ...data,
          treeNodeId: node.id,
        });
      }
    }

    // Keep only the table data. TODO: Deal with graph data elsewhere
    const tableDataByTitle: { [key: string]: ITreeNodeData[] } = {};
    for (const title in dataByTableTitle) {
      tableDataByTitle[title] = dataByTableTitle[title].filter(
        (x) => x.type === TreeNodeDataType.Table
      );
    }

    // Format data for a table
    // const allTableData: { [key: string]: ITableData } = {};
    const allTableData: any[] = []; // Title, ITableData
    const falseFunc = () => false;
    for (const title in tableDataByTitle) {
      // Get the headers
      let headers: string[] = [];

      for (const data of tableDataByTitle[title]) {
        for (const header of Object.keys(data.data)) {
          if (!headers.includes(header)) {
            headers.push(header);
          }
        }
      }

      let headerSort = TableHeaderSort.All;
      for (const data of tableDataByTitle[title]) {
        if (data.headerSort === TableHeaderSort.AllButFirst) {
          headerSort = TableHeaderSort.AllButFirst;
          break;
        }
        if (data.headerSort === TableHeaderSort.None) {
          headerSort = TableHeaderSort.None;
          break;
        }
      }

      const firstHeader = headers[0];
      const otherHeaders = headers.slice(1);
      switch (headerSort) {
        case TableHeaderSort.All:
          // Sort headers case insensitive
          headers.sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: "base" })
          );
          break;
        case TableHeaderSort.AllButFirst:
          otherHeaders.sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: "base" })
          );
          headers = [firstHeader, ...otherHeaders];
          break;
        case TableHeaderSort.None:
          // Do nothing
          break;
      }

      const tableData: ITableData = {
        headers: headers.map((x) => ({ text: x })),
        rows: [],
      };

      // Add "Molecule" and "id" to the headers, at beginning
      tableData.headers.unshift({
        text: "id",
        showColumnFunc: falseFunc,
      });
      tableData.headers.unshift({ text: "Entry" });

      const defaultRow: { [key: string]: CellValue } = {};
      for (const header of headers) {
        defaultRow[header] = "";
      }

      tableData.rows = dataByTableTitle[title].map((data: ITreeNodeData) => {
        // The title should reflect ancestors.
        const treeNode = allMols.flattened.filters.onlyId(
          data.treeNodeId as string
        );
        let title = treeNode?.title;
        if (treeNode) {
          title = this.nodePathName(treeNode, allMols);
        }

        return {
          ...defaultRow,
          ...data.data,
          Entry: title,
          id: treeNode?.id,
        };
      });

      allTableData.push([title, tableData]);

      // allTableData[title] = tableData;
    }

    // Sort by first element
    allTableData.sort((a, b) => {
      if (a[0] < b[0]) {
        return -1;
      }
      if (a[0] > b[0]) {
        return 1;
      }
      return 0;
    });

    return allTableData;
  }

  /**
   * Gets the name of the molecule in path-like format.
   *
   * @param {TreeNode} treeNode  The molecule container.
   * @param {TreeNodeList} allMols  All the molecules.
   * @returns {string}  The name of the molecule in path-like format.
   */
  nodePathName(treeNode: TreeNode, allMols: TreeNodeList): string {
    return treeNode.descriptions.pathName("/", 30 /*35*/, allMols);
  }

  /**
   * Runs when row is clicked.
   *
   * @param {any} row  The row that was clicked.
   */
  rowClicked(row: any) {
    // Note that row looks like { [key: string]: CellValue }, but with some
    // extra properties not present on CellValue.
    selectProgramatically(row.treeNodeId.val);
  }

  /**
   * Scrolls to the given table when a TOC link is clicked.
   *
   * @param {string} caption  The caption (title) of the table.
   */
  tocLinkScroll(caption: string) {
    const id = this.slugify(caption);

    // Smooth scroll. TODO: Tried to use this.$refs, but didn't work. Could
    // revisit.
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  /**
   * Slugifies the given string.
   *
   * @param {string} text  The text to slugify.
   * @returns {string}  The slugified text.
   */
  slugify(text: string): string {
    return slugify(text);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
/* Active state styling */
/* .btn-check:checked + .btn-outline-primary {
  color: #fff;
  background-color: #0d6efd;
  border-color: #0d6efd;
} */

/* Remove hover effects */
.btn-outline-primary:hover {
  background-color: transparent;
  color: #0d6efd;
  cursor: pointer;
  box-shadow: none !important;
}

.btn-outline-primary,
.btn-outline-secondary {
  box-shadow: none !important;
}

.btn-outline-secondary:hover {
  background-color: transparent;
  color: #0d6efd;
  box-shadow: none !important;
}

/* Keep original outline color */
/* .btn-outline-primary {
  color: #0d6efd;
  border-color: #0d6efd;
}
.btn-check:checked + .btn-outline-secondary {
  color: #fff;
  background-color: #6c757d;
  border-color: #6c757d;
} */

/* .btn-outline-secondary:hover {
  color: #fff;
  background-color: #6c757d;
  border-color: #6c757d;
} */
</style>