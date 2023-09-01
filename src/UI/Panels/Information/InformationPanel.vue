<template>
    <div
        class="information-container"
        ref="information-container"
        v-if="smiles !== ''"
    >
        <Viewer2D width="100%" :maxHeight="150" :smiles="smiles" />
        <FormWrapper cls="mb-3">
            <FormInput
                v-model="smiles"
                :readonly="true"
                placeHolder="SMILES"
            ></FormInput>
        </FormWrapper>
        <MolProps :smiles="smiles" :treeNode="treeNode" />
    </div>
</template>

<script lang="ts">
import MolProps from "@/UI/Components/MolProps.vue";
import Table from "@/UI/Components/Table/Table.vue";
import Viewer2D from "@/UI/Components/Viewer2D.vue";
import FormInput from "@/UI/Forms/FormInput.vue";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { Options, Vue } from "vue-class-component";
import { Watch } from "vue-property-decorator";
import { getFirstSelected, getSmilesOfTreeNode } from "./Utils";

/**
 * InformationPanel component
 */
@Options({
    components: {
        Viewer2D,
        MolProps,
        Table,
        FormInput,
        FormWrapper,
    },
})
export default class InformationPanel extends Vue {
    smiles = "";
    treeNode: TreeNode | undefined = undefined;

    /**
     * Gets the molecules from the vuex store.
     *
     * @returns {TreeNodeList}  The molecules from the vuex store.
     */
    get molecules(): TreeNodeList {
        return this.$store.state.molecules;
    }

    getSmilesTimeout: any = undefined;

    /**
     * Watches the molecules in the vuex store. If the molecules change, set the
     * smiles of the selected molecule.
     *
     * @param {TreeNodeList} allMolecules  The new value of the molecules.
     */
    //  @Watch("molecules", { immediate: false, deep: true })
    @Watch("molecules", { immediate: true, deep: true })
    onMolecules(allMolecules: TreeNodeList) {
        const firstSelected = getFirstSelected(allMolecules);

        if (firstSelected === null) {
            return;
        }

        // If firstSelected doesn't have model, then cancel.
        // if (firstSelected.model === undefined) {
        //     return;
        // }

        // Wrapping it in a cancellable timeout like this to prevent multiple
        // ones in succession and improve responsiveness.
        if (this.getSmilesTimeout !== undefined) {
            clearTimeout(this.getSmilesTimeout);
        }

        this.getSmilesTimeout = setTimeout(() => {
            getSmilesOfTreeNode(firstSelected)
                .then((smi) => {
                    // If smi has more than 5 "*", it's probably not valid.
                    if (smi.split("*").length > 5) {
                        return;
                    }

                    this.smiles = smi.replace(" ", "\t").split("\t")[0];
                    this.treeNode = firstSelected;
                    return;
                })
                .catch((err) => {
                    throw err;
                });
        }, 500);
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
