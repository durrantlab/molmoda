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
    <MolProps :smiles="smiles" :molContainer="molContainer" />
  </div>
</template>

<script lang="ts">
import MolProps from "@/UI/Components/MolProps.vue";
import Table from "@/UI/Components/Table/Table.vue";
import Viewer2D from "@/UI/Components/Viewer2D.vue";
import FormInput from "@/UI/Forms/FormInput.vue";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { Options, Vue } from "vue-class-component";
import { Watch } from "vue-property-decorator";
import { getFirstSelected, getSmilesOfMolContainer } from "./Utils";

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
  molContainer: IMolContainer | undefined = undefined;

  /**
   * Gets the molecules from the vuex store.
   *
   * @returns {IMolContainer[]}  The molecules from the vuex store.
   */
  get molecules(): IMolContainer[] {
    return this.$store.state.molecules;
  }

  /**
   * Watches the molecules in the vuex store. If the molecules change, set the
   * smiles of the selected molecule.
   *
   * @param {IMolContainer[]} allMolecules  The new value of the molecules.
   */
  @Watch("molecules", { immediate: false, deep: true })
  onMolecules(allMolecules: IMolContainer[]) {
    const firstSelected = getFirstSelected(allMolecules);

    if (firstSelected === null) {
      return;
    }

    getSmilesOfMolContainer(firstSelected)
      .then((smi) => {
        this.smiles = smi;
        this.molContainer = firstSelected;
        return;
      })
      .catch((err) => {
        console.log(err);
        return;
      });
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
