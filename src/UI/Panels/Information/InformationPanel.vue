<template>
    <div
        class="information-container"
        ref="information-container"
    >
    <div v-if="selectedNodeType === 'compound' && smiles !== ''">
        <SmilesPopupViewer width="100%" :maxHeight="100" :smiles="smiles" />
        <FormWrapper cls="mb-3">
            <FormInput
                v-model="smiles"
                :readonly="true"
                placeHolder="SMILES..."
            ></FormInput>
        </FormWrapper>
        <MolProps :smiles="smiles" :treeNode="treeNode" />
        <Alert
            type="warning"
            extraStyle="display: inline-block;"
            :minimal="true"
            >These molecular properties depend on protonation. Use
            <PluginPathLink plugin="protonatecomps"></PluginPathLink> to
            protonate your compound(s) at a specific pH.</Alert
        >
    </div>
    <div v-else-if="selectedNodeType === 'protein' && proteinSequenceInfo.length > 0">
      <ProteinSequenceViewer :sequence="proteinSequenceInfo" :treeNode="treeNode" class="mb-2" />
      <!-- Optionally, add protein-specific info/props here -->
       <Alert
        type="warning"
        extraStyle="display: inline-block;"
        :minimal="true"
        class="mt-1" 
      >Amino acid properties displayed are typical; actual properties can vary with local environment.
      Use <PluginPathLink plugin="reduce"></PluginPathLink> to
        protonate your protein(s) at a specific pH.</Alert>
    </div>
    <div v-else-if="treeNode === undefined && molecules.length > 0">
      <p class="text-muted text-center p-3">Select a protein or compound in the Navigator panel to view its information.</p>
    </div>
     <div v-else-if="molecules.length === 0">
      <p class="text-muted text-center p-3">No molecules loaded.</p>
    </div>
     <div v-else-if="selectedNodeType !== 'protein' && selectedNodeType !== 'compound' && treeNode !== undefined">
        <p class="text-muted text-center p-3">Select a protein or compound to view detailed information. Currently selected: {{treeNode.type}}.</p>
    </div>
    </div>
</template>
<script lang="ts">
import MolProps from "@/UI/Components/MolProps.vue";
import Table from "@/UI/Components/Table/Table.vue";
import SmilesPopupViewer from "@/UI/Components/SmilesPopupViewer.vue";
import ProteinSequenceViewer from "./ProteinSequenceViewer.vue"; // New import
import FormInput from "@/UI/Forms/FormInput.vue";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { Options, Vue } from "vue-class-component";
import { Watch } from "vue-property-decorator";
import { getFirstSelected, getSmilesOfTreeNode, getOrderedResidueSequenceFromModel, ResidueInfo } from "./InformationPanelUtils";
import Alert from "@/UI/Layout/Alert.vue";
import PluginPathLink from "@/UI/Navigation/PluginPathLink.vue";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";

/**
 * InformationPanel component
 */
@Options({
    components: {
        SmilesPopupViewer,
    ProteinSequenceViewer,
        MolProps,
        Table,
        FormInput,
        FormWrapper,
        Alert,
        PluginPathLink,
    },
})
export default class InformationPanel extends Vue {
    smiles = "";
  proteinSequenceInfo: ResidueInfo[] = [];
    treeNode: TreeNode | undefined = undefined;
  selectedNodeType: TreeNodeType | null = null;

    /**
     * Gets the molecules from the vuex store.
     *
     * @returns {TreeNodeList}  The molecules from the vuex store.
     */
    get molecules(): TreeNodeList {
        return this.$store.state.molecules;
    }

  getSmilesTimeout: any = undefined; // For debouncing SMILES fetching
  getSequenceTimeout: any = undefined; // For debouncing sequence fetching

    /**
     * Watches the molecules in the vuex store. If the molecules change, set the
     * smiles of the selected molecule.
     *
     * @param {TreeNodeList} allMolecules  The new value of the molecules.
     */
  @Watch("$store.state.molecules", { immediate: true, deep: true })
  async onMolecules(allMolecules: TreeNodeList) {
        const firstSelected = getFirstSelected(allMolecules);

        if (this.getSmilesTimeout !== undefined) {
            clearTimeout(this.getSmilesTimeout);
        }
    if (this.getSequenceTimeout !== undefined) {
      clearTimeout(this.getSequenceTimeout);
    }

    if (firstSelected === null) {
      this.smiles = "";
      this.proteinSequenceInfo = [];
      this.treeNode = undefined;
      this.selectedNodeType = null;
                        return;
                    }

    this.treeNode = firstSelected; // Store the current TreeNode

    if (firstSelected.type === TreeNodeType.Compound) {
      this.selectedNodeType = TreeNodeType.Compound;
      this.proteinSequenceInfo = []; // Clear protein sequence
      this.getSmilesTimeout = setTimeout(async () => {
        try {
          let smi = await getSmilesOfTreeNode(firstSelected);
          smi = smi.split(/\s/)[0]; // Keep only smiles string (not name)
          if (smi.split("*").length <= 5) { // Basic validation
            this.smiles = smi;
          } else {
            this.smiles = ""; // Invalid SMILES
          }
        } catch (err) {
          console.error("Error getting SMILES:", err);
          this.smiles = "";
        }
      }, 250); // Debounce
    } else if (firstSelected.type === TreeNodeType.Protein) {
      this.selectedNodeType = TreeNodeType.Protein;
      this.smiles = ""; // Clear SMILES
      this.getSequenceTimeout = setTimeout(async () => {
        try {
          this.proteinSequenceInfo = await getOrderedResidueSequenceFromModel(firstSelected.model);
        } catch (err) {
          console.error("Error getting protein sequence:", err);
          this.proteinSequenceInfo = [];
        }
      }, 250); // Debounce
    } else {
      // Other type selected or no specific model type for info display
      this.smiles = "";
      this.proteinSequenceInfo = [];
      this.selectedNodeType = firstSelected.type || null; // Store type if available
    }
    }
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
