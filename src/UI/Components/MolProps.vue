<template>
    <Table :tableData="lipinskiTableData" caption="Lipinski Properties" />
    <Table :tableData="otherTableData" caption="Other Properties" />
    <Table :tableData="countsTableData" caption="Counts" />
</template>

<script lang="ts">
import {
    calcMolProps,
    ICalcMolProps,
} from "@/Plugins/Optional/MolProps/CalcMolProps";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import Table from "./Table/Table.vue";
import { ITableData } from "./Table/Types";

/**
 * MolProps component
 */
@Options({
    components: {
        Table,
    },
})
export default class MolProps extends Vue {
    @Prop({ default: "" }) smiles!: string;
    @Prop({ default: undefined }) treeNode!: TreeNode | undefined;

    lipinskiTableData: ITableData = { headers: [], rows: [] };
    countsTableData: ITableData = { headers: [], rows: [] };
    otherTableData: ITableData = { headers: [], rows: [] };

    props = "";

    /**
     * Watch for changes in the smiles prop. Update the properties when the SMILES
     * string changes.
     */
    @Watch("smiles")
    onSmiles() {
        calcMolProps([this.smiles], [this.treeNode])
            .then((resps: ICalcMolProps[]) => {
                // Only one molecule.
                const resp = resps[0];
                this.lipinskiTableData = this.convertDescriptorsToTableData(
                    resp.lipinski
                );
                this.countsTableData = this.convertDescriptorsToTableData(
                    resp.counts
                );
                this.otherTableData = this.convertDescriptorsToTableData(
                    resp.other
                );
                return;
            })
            .catch((err: Error) => {
                throw err;
            });
    }

    /**
     * Given a list of descriptors, convert to an ITableData object.
     *
     * @param {any[][]} descriptors  List of descriptors
     * @returns {ITableData}         Table data
     */
    convertDescriptorsToTableData(descriptors: any[][]): ITableData {
        const headers = descriptors.map((d: any[]) => {
            return { text: d[0], note: d[2] };
        });
        const row: { [key: string]: any } = {};
        for (let descriptor of descriptors) {
            row[descriptor[0] as string] = descriptor[1];
        }

        return { headers: headers, rows: [row] };
    }

    /**
     * mounted function
     */
    mounted() {
        this.onSmiles();
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
