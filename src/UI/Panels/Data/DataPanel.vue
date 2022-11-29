<template>
  <!-- Iterate through key, pair of allTableData -->
  <h5>Data, Visible/Selected Molecules</h5>

  <div v-for="(tableData, tableName) in allTableData" v-bind:key="tableName">
    <Table
      :tableData="tableData"
      :caption="tableName"
      :allowTextWrap="false"
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
  get allTableData(): { [key: string]: ITableData } {
    const allMols = this.$store.state.molecules;

    // First get all the visible or selected nodes.
    const nodes = getAllNodesFlattened(allMols).filter(
      (x: IMolContainer) => x.visible || x.selected !== SelectedType.False
    );

    // Get the data for each molecule.
    const datasByMol = nodes
      .filter((x) => x.data)
      .map((x) => {
        return x.data?.map((d) => {
          d.molContainer = x;
          return d;
        }) as IMolContainerData[];
      });

    // Organize that data by data title instead of molecule.
    const dataByTitle: { [key: string]: IMolContainerData[] } = {};
    for (const dataByMol of datasByMol) {
      for (const data of dataByMol) {
        if (data.title === undefined) {
          continue;
        }
        const title = data.title;
        if (dataByTitle[title] === undefined) {
          dataByTitle[title] = [];
        }
        // delete data.title;
        dataByTitle[title].push(data);
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
    const allTableData: { [key: string]: ITableData } = {};
    const falseFunc = (tableData: ITableData) => false;

    for (const title in dataByTitle) {
      // Get the headers
      const headers: string[] = [];
      for (const data of tableDataByTitle[title]) {
        for (const header of Object.keys(data.data)) {
          if (!headers.includes(header)) {
            headers.push(header);
          }
        }
      }
      headers.sort();

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

      allTableData[title] = tableData;
    }

    return allTableData;
  }

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

  rowClicked(row: { [key: string]: CellValue }) {
    selectProgramatically(row.id as string);
    // debugger;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
