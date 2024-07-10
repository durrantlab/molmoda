<template>
    <span>
        <!-- modelValue="a" -->
        <!-- <FormSelectRegion v-model="test"></FormSelectRegion> -->
        <!-- [[ {{test}} ]] -->

        <!-- Iterate through key, pair of allTableData -->
        <h5>Data: Visible/Selected Molecules</h5>

        <p v-if="allTableData.length === 0" style="font-size: 14px">
            No molecules (visible or selected) currently have any data to
            display
        </p>
        <!-- <span v-else-if="allTableData.length > 1">
    <h6 v-for="tableData in allTableData" v-bind:key="tableData[0]" style="display: inline-block;">
      <span class="badge bg-secondary">{{ tableData[0] }}</span>
    </h6>
  </span> -->

        <!-- class="btn-group btn-group-sm mb-3" -->
        <!-- style="flex-wrap: wrap" -->
        <!-- role="group" -->

        <!-- style="margin: 1px"
  class="btn btn-primary btn-sm" -->
        <p v-else-if="allTableData.length > 1" aria-label="Tables" class="mb-3">
            Available tables:
            <span
                v-for="(tableData, idx) in allTableData"
                v-bind:key="tableData[0]"
            >
                <a class="link-primary" @click.prevent="tocLinkScroll(tableData[0])">
                    {{ tableData[0] }} </a
                ><span v-if="idx !== allTableData.length - 1">, </span>
            </span>
        </p>

        <div v-for="tableData in allTableData" v-bind:key="tableData[0]">
            <Table
                :id="slugify(tableData[0])"
                :tableData="tableData[1]"
                :caption="tableData[0]"
                :noFixedTable="noFixedTable(tableData[1])"
                @rowClicked="rowClicked"
                :clickableRows="true"
            >
                <!-- <template #afterHeader> After </template> -->
            </Table>
        </div>
    </span>
</template>

<script lang="ts">
/* eslint-disable no-unreachable */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";

import Table from "@/UI/Components/Table/Table.vue";
import { CellValue, ITableData } from "@/UI/Components/Table/Types";
import {
    TreeNodeDataType,
    SelectedType,
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

    /**
     * Whether the table should be allowed to wrap text.
     *
     * @param {ITableData} tableData  The table data.
     * @returns {boolean}  Whether the table should be allowed to wrap text.
     */
    noFixedTable(tableData: ITableData): boolean {
        // In the past I allowed text wrapping if there were more than 5 columns
        // to try to make it more readable, but I've come to prefer never
        // wrapping.
        // return tableData.headers.length > 5;
        return true;
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
        const nodes = allMols.flattened.filter(
            // mol_filter_ok
            (x: TreeNode) => x.visible || x.selected !== SelectedType.False
        );

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
            
            let headerSort = TableHeaderSort.All
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
            const otherHeaders = headers.slice(1)
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
                    headers = [firstHeader, ...otherHeaders]
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
        selectProgramatically(row.treeNodeId as string);
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
<style scoped lang="scss"></style>
