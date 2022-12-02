<template>
  <!-- Iterate through key, pair of allTableData -->
  <h5>Data: Visible/Selected Molecules</h5>

  <p v-if="allTableData.length === 0" style="font-size: 14px">
    No molecules (visible or selected) currently have any data to display
  </p>

  <div v-for="tableData in allTableData" v-bind:key="tableData[0]">
    <Table
      :tableData="tableData[1]"
      :caption="tableData[0]"
      :allowTextWrap="allowTextWrap(tableData[1])"
      @rowClicked="rowClicked"
      :clickableRows="true"
    >
      <!-- <template #afterHeader> After </template> -->
    </Table>
  </div>
</template>

<script lang="ts">
/* eslint-disable no-unreachable */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";

import Table from "@/UI/Components/Table/Table.vue";
import { CellValue, ITableData } from "@/UI/Components/Table/Types";
import {
  IMolContainer,
  IMolContainerData,
  MolContainerDataType,
  SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
  getAllNodesFlattened,
  getNodeAncestory,
} from "@/UI/Navigation/TreeView/TreeUtils";
import { selectProgramatically } from "@/UI/Navigation/TitleBar/MolSelecting";

/**
 * DataPanel component
 */
@Options({
  components: {
    Table,
  },
})
export default class DataPanel extends Vue {
  /**
   * Whether the table should be allowed to wrap text.
   *
   * @param {ITableData} tableData  The table data.
   * @returns {boolean}  Whether the table should be allowed to wrap text.
   */
  allowTextWrap(tableData: ITableData): boolean {
    return tableData.headers.length > 5;
  }

  /**
   * Get the data for the table.
   *
   * @returns {any}  The data for the table.
   */
  get allTableData(): any[] {
    // { [key: string]: ITableData }
    const allMols = this.$store.state.molecules;

    // First get all the visible or selected nodes.
    const nodes = getAllNodesFlattened(allMols).filter(
      (x: IMolContainer) => x.visible || x.selected !== SelectedType.False
    );

    const dataByTitle: { [key: string]: IMolContainerData[] } = {};
    for (const node of nodes) {
      if (node.data === undefined) {
        continue;
      }
      const titles = Object.keys(node.data);
      titles.sort();

      for (const title of titles) {
        const data = node.data[title];
        if (dataByTitle[title] === undefined) {
          dataByTitle[title] = [];
        }
        dataByTitle[title].push({
          ...data,
          molContainer: node,
        });
      }
    }

    // Keep only the table data. TODO: Deal with graph data elsewhere
    const tableDataByTitle: { [key: string]: IMolContainerData[] } = {};
    for (const title in dataByTitle) {
      tableDataByTitle[title] = dataByTitle[title].filter(
        (x) => x.type === MolContainerDataType.Table
      );
    }

    // Format data for a table
    // const allTableData: { [key: string]: ITableData } = {};
    const allTableData: any[] = []; // Title, ITableData
    const falseFunc = () => false;
    for (const title in tableDataByTitle) {
      // Get the headers
      const headers: string[] = [];
      for (const data of tableDataByTitle[title]) {
        for (const header of Object.keys(data.data)) {
          if (!headers.includes(header)) {
            headers.push(header);
          }
        }
      }

      // Sort headers case insensitive
      headers.sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );

      const tableData: ITableData = {
        headers: headers.map((x) => ({ text: x })),
        rows: [],
      };

      // Add "Molecule" and "id" to the headers, at beginning
      tableData.headers.unshift({ text: "id", showColumnFunc: falseFunc });
      tableData.headers.unshift({ text: "Molecule" });

      const defaultRow: { [key: string]: CellValue } = {};
      for (const header of headers) {
        defaultRow[header] = "";
      }

      tableData.rows = dataByTitle[title].map((data: IMolContainerData) => {
        // The title should reflect ancestors.
        let title = data.molContainer?.title;
        if (data.molContainer) {
          title = this.nodePathName(data.molContainer, allMols);
        }

        return {
          ...defaultRow,
          ...data.data,
          Molecule: title,
          id: data.molContainer?.id,
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
   * @param {IMolContainer} molContainer  The molecule container.
   * @param {IMolContainer[]} allMols  All the molecules.
   * @returns {string}  The name of the molecule in path-like format.
   */
  nodePathName(molContainer: IMolContainer, allMols: IMolContainer[]): string {
    const maxLength = 20;

    const ancestors = getNodeAncestory(molContainer, allMols);
    let titles = ancestors.map((x) => x.title);

    // Simplify words some
    titles = titles.map((x) => {
      return x
        .replace("Protein", "Prot")
        .replace("Compound", "Cmpd")
        .replace("Solvent", "Sol");
    });

    let newTitle = titles.join(">");
    while (titles.length > 3) {
      if (newTitle.length < maxLength) {
        break;
      }

      // remove any existing elements of value ...
      titles = titles.filter((x) => x !== "...");

      // Set middle element to ...
      let middle = Math.floor(titles.length / 2);
      if (middle === titles.length - 1) {
        middle--;
      }
      if (middle === 0) {
        middle++;
      }
      titles[middle] = "...";

      newTitle = titles.join(">");
    }

    if (newTitle.length > maxLength) {
      newTitle = molContainer.title;
    }
    return newTitle;
  }

  /**
   * Runs when row is clicked.
   *
   * @param {any} row  The row that was clicked.
   */
  rowClicked(row: { [key: string]: CellValue }) {
    selectProgramatically(row.id as string);
    // debugger;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
