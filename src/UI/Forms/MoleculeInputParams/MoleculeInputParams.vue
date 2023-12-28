<template>
    <span>
        <!-- :label="'Which ' + molNameToUse + ' to consider?'" -->
        <FormWrapper cls="border-0">
            <FormCheckBox
                v-model="val.molsToConsider.visible"
                :text="'Consider visible ' + molNameToUse"
                id="visMols"
                class="mt-2"
            />
            <FormCheckBox
                v-model="val.molsToConsider.selected"
                :text="'Consider selected ' + molNameToUse"
                id="selMols"
            />
            <FormCheckBox
                v-model="val.molsToConsider.hiddenAndUnselected"
                :text="
                    'Consider other ' +
                    molNameToUse +
                    ' (hidden and unselected)'
                "
                id="otherMols"
            />
            <FormCheckBox
                v-if="val.considerProteins && val.allowUserToToggleIncludeMetalsSolventAsProtein"
                v-model="val.includeMetalsSolventAsProtein"
                text="Count metals/solvent as part of the protein"
                id="countMetalsSolvent"
            />
        </FormWrapper>
        <!-- <FormWrapper cls="mt-3">
      <Alert type="info">{{ summary }}</Alert>
    </FormWrapper> -->

        <FormElementDescription
            :description="summary"
        ></FormElementDescription>
    </span>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import FormElementDescription from "@/UI/Forms/FormElementDescription.vue";
import FormWrapper from "../FormWrapper.vue";
import Alert from "@/UI/Layout/Alert.vue";
import FormSelect from "../FormSelect.vue";
import { compileMolModels } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
import FormCheckBox from "../FormCheckBox.vue";
import { MoleculeInput } from "./MoleculeInput";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

/**
 * CombineProteins component
 */
@Options({
    components: {
        FormElementDescription,
        FormSelect,
        FormWrapper,
        Alert,
        FormCheckBox,
    },
})
export default class MoleculeInputParams extends Vue {
    @Prop({ default: new MoleculeInput() })
    modelValue!: MoleculeInput;

    // Shadows modelValue
    val: MoleculeInput = new MoleculeInput();

    /**
     * Gets the molecules from the store.
     *
     * @returns {TreeNodeList}  The molecules from the store.
     */
    get molecules(): TreeNodeList {
        return this.$store.state.molecules;
    }

    /**
     * Gets the name of the molecule to use (e.g., "compounds" or "molecules").
     *
     * @returns {string}  The name of the molecule to use.
     */
    get molNameToUse(): string {
        if (this.val.considerCompounds && !this.val.considerProteins) {
            return "compounds";
        }
        return "molecules";
    }

    /**
     * Gets the summary of the current protein/compounds that will be used.
     *
     * @returns {string}  The summary of the current protein/compounds that will
     *     be used.
     */
    get summary(): string {
        let actsOn = "";
        if (this.val.considerCompounds && this.val.considerProteins) {
            actsOn = "protein/compound pairs";
        } else if (this.val.considerCompounds) {
            actsOn = "compounds";
        } else if (this.val.considerProteins) {
            actsOn = "proteins";
        }

        const molsToConsid = this.val.molsToConsider;

        let whichMols = "";
        if (
            molsToConsid.visible === true &&
            molsToConsid.selected === true &&
            molsToConsid.hiddenAndUnselected === true
        ) {
            whichMols = "all";
        } else if (
            molsToConsid.visible === true &&
            molsToConsid.selected === true
        ) {
            whichMols = "the visible and/or selected";
        } else if (molsToConsid.visible === true) {
            whichMols = "the visible";
        } else if (molsToConsid.selected === true) {
            whichMols = "the selected";
        }

        let prts: string[] = [];

        const mergedByMols = compileMolModels(
            molsToConsid,
            true // Keep compounds separate.
        );

        const nodeGroups = mergedByMols.nodeGroups ?? [];
        const nodeGroupsCount = nodeGroups.length;
        const compoundsNodes = mergedByMols.compoundsNodes ?? [];
        const compoundsNodesCount = compoundsNodes.length;

        if (this.val.considerProteins) {
            prts.push(
                nodeGroupsCount !== 1
                    ? `${nodeGroupsCount} proteins`
                    : "1 protein"
                //  + ` (${this.listMols(nodeGroups[0])})` // TODO: First mol for now. Need to think about this. Parent?
            );
        }

        if (this.val.considerCompounds) {
            prts.push(
                compoundsNodesCount !== 1
                    ? `${compoundsNodesCount} compounds`
                    : "1 compound" //  + ` (${this.listMols(compoundsNodes)})`
            );
        }
        let components = prts.join(" and ");

        let numRuns = "";
        let warningClass = "";
        if (this.val.considerCompounds && this.val.considerProteins) {
            const total = nodeGroupsCount * compoundsNodesCount;
            numRuns = `${total} (${nodeGroupsCount} x ${compoundsNodesCount}) times`;
            if (total === 0) warningClass = "text-danger";
        } else if (this.val.considerProteins) {
            numRuns = `${nodeGroupsCount} times (once for each protein)`;
            if (nodeGroupsCount === 0) warningClass = "text-danger";
        } else if (this.val.considerCompounds) {
            numRuns = `${compoundsNodesCount} times (once for each compound)`;
            if (compoundsNodesCount === 0) warningClass = "text-danger";
        } else {
            numRuns = "0 times";
            warningClass = "text-danger";
        }

        return `This calculation acts on ${actsOn}. Among ${whichMols} molecules, I found ${components}, <span class="${warningClass}">so this calculation will run ${numRuns}.</span>`;
    }

    /**
     * Lists the molecules in string format, at most two.
     *
     * @param {TreeNodeList | undefined} mols  The molecules to list.
     * @returns {string}  The molecules in string format, at most two.
     */
    // listMols(mols: TreeNodeList | undefined): string {
    //   if (mols === undefined) {
    //     return "";
    //   }

    //   let descriptions = mols.map((m) =>
    //     getMolDescription(m, this.molecules, true)
    //   );
    //   if (descriptions.length > 2) {
    //     descriptions = descriptions.slice(0, 2);
    //     descriptions.push("...");
    //   }
    //   return descriptions.join(", ");
    // }

    /**
     * Watches val and emits the modelValue.
     *
     * @param {MoleculeInput} newVal  The new value.
     */
    @Watch("val", { deep: true })
    onValChanged(newVal: MoleculeInput) {
        this.$emit("update:modelValue", newVal);
        this.$emit("onChange");
    }

    /**
     * Watches modelValue and sets val accordingly.
     *
     * @param {MoleculeInput} newVal  The new value.
     */
    @Watch("modelValue", { deep: true })
    onModelValueChanged(newVal: MoleculeInput) {
        this.val = newVal;
    }

    /**
     * The mounted function, to set the initial val from modelValue.
     */
    mounted() {
        this.val = this.modelValue;
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
// Input of type color
.form-control-color {
    width: 100%;
}
</style>
