<template>
    <span>
        <Table :tableData="lipinskiTableData" caption="Lipinski Properties" />
        <Table :tableData="otherTableData" caption="Other Properties" />
        <Table :tableData="countsTableData" caption="Counts" />
    </span>
</template>

<script lang="ts">
import {
    calcMolProps,
    ICalcMolProps,
    lipinskiTitle,
} from "@/Plugins/Optional/MolProps/CalcMolProps";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import Table from "./Table/Table.vue";
import { ITableData } from "./Table/Types";

const alreadyCalculatedLipinski: {[key: string]: any} = {}
const alreadyCalculatedCounts: {[key: string]: any} = {}
const alreadyCalculatedOther: {[key: string]: any} = {}

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
        // Don't calculate twice! If it has lipinskiTitle, assume it also has
        // countsTitle and otherTitle.
        // if (this.treeNode?.data && this.treeNode.data[lipinskiTitle]) {
        //     // console.log("Already calculated.");
        //     return;
        // }

        if (alreadyCalculatedLipinski[this.smiles]) {
            this.lipinskiTableData = this.convertDescriptorsToTableData(
                alreadyCalculatedLipinski[this.smiles]
            );
            this.countsTableData = this.convertDescriptorsToTableData(
                alreadyCalculatedCounts[this.smiles]
            );
            this.otherTableData = this.convertDescriptorsToTableData(
                alreadyCalculatedOther[this.smiles]
            );
            // console.log("Already calculated.");
            return;
        }

        calcMolProps([this.smiles], [this.treeNode])
            .then((resps: ICalcMolProps[]) => {
                // Only one molecule.
                const resp = resps[0];
                this.lipinskiTableData = this.convertDescriptorsToTableData(
                    resp.lipinski
                );
                alreadyCalculatedLipinski[this.smiles] = resp.lipinski;

                this.countsTableData = this.convertDescriptorsToTableData(
                    resp.counts
                );
                alreadyCalculatedCounts[this.smiles] = resp.counts;

                this.otherTableData = this.convertDescriptorsToTableData(
                    resp.other
                );
                alreadyCalculatedOther[this.smiles] = resp.other;

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
    convertDescriptorsToTableData(
        descriptors: [string, number, string][]
    ): ITableData {
        if (!descriptors.map) {
            console.trace();
            debugger;
        }
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
