<template>
    <span>
        <div class="input-group">
            <select class="form-select form-select-sm" :id="id" :disabled="disabled || filteredMolecules.length === 0"
                @input="handleInput" :value="modelValue">
                <option value="" disabled>
                    {{
                        filteredMolecules.length === 0
                            ? "No molecules available"
                            : "Select a molecule..."
                    }}
                </option>
                <optgroup v-if="visibleMolecules.length > 0" label="Visible Molecules">
                    <option v-for="opt in visibleMolecules" :value="opt.id" :key="opt.id">
                        {{ opt.title }}
                    </option>
                </optgroup>
                <optgroup v-if="hiddenMolecules.length > 0" label="Hidden Molecules">
                    <option v-for="opt in hiddenMolecules" :value="opt.id" :key="opt.id">
                        {{ opt.title }}
                    </option>
                </optgroup>
            </select>
        </div>
        <FormElementDescription :description="description"></FormElementDescription>
    </span>
</template>
<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import FormElementDescription from "../FormElementDescription.vue";
import { randomID } from "@/Core/Utils/MiscUtils";
import { MoleculeTypeFilter } from "./FormSelectMoleculeInterfaces";
/**
 * A select dropdown component for choosing a top-level molecule from the main
 * tree. It supports filtering by molecule type (protein, compound, or all) and
 * groups molecules by visibility.
 */
@Options({
    components: {
        FormElementDescription,
    },
})
export default class FormSelectMolecule extends Vue {
    /**
     * The ID of the currently selected molecule. This is the v-model prop.
     *
     * @type {string}
     * @required
     */
    @Prop({ required: true }) modelValue!: string;
    /**
     * A unique identifier for the form element.
     *
     * @type {string}
     */
    @Prop({ default: () => randomID() }) id!: string;
    /**
     * If true, the select dropdown is disabled.
     *
     * @type {boolean}
     * @default false
     */
    @Prop({ default: false }) disabled!: boolean;
    /**
     * A description of the form element, displayed below the input.
     *
     * @type {string}
     */
    @Prop({ default: "" }) description!: string;
    /**
     * The type of molecules to display in the dropdown.
     *
     * @type {MoleculeTypeFilter}
     * @default MoleculeTypeFilter.All
     */
    @Prop({ default: MoleculeTypeFilter.All }) filterType!: MoleculeTypeFilter;

    /**
     * Gets all molecules from the Vuex store.
     *
     * @returns {TreeNodeList} The root TreeNodeList.
     */
    get allMolecules(): TreeNodeList {
        return this.$store.state.molecules as TreeNodeList;
    }

    /**
     * Gets the top-level molecules filtered by the specified type.
     *
     * @returns {TreeNode[]} An array of filtered top-level TreeNode objects.
     */
    get filteredMolecules(): TreeNode[] {
        if (!this.allMolecules) {
            return [];
        }
        return this.allMolecules.nodes.filter((node) => {
            // A top-level molecule should be shown if it or any of its descendants
            // match the filter criteria.
            const nodesToCheck = new TreeNodeList([node]).flattened;
            switch (this.filterType) {
                case MoleculeTypeFilter.Protein:
                    return nodesToCheck.some((d) => d.type === TreeNodeType.Protein);
                case MoleculeTypeFilter.Compound:
                    return nodesToCheck.some((d) => d.type === TreeNodeType.Compound);
                case MoleculeTypeFilter.All:
                    return nodesToCheck.some(
                        (d) =>
                            d.type === TreeNodeType.Protein ||
                            d.type === TreeNodeType.Compound
                    );
                default:
                    return false;
            }
        });
    }
    /**
     * Gets the list of visible molecules from the filtered list.
     *
     * @returns {TreeNode[]} An array of visible TreeNode objects.
     */
    get visibleMolecules(): TreeNode[] {
        return this.filteredMolecules.filter((node) => node.visible);
    }
    /**
     * Gets the list of hidden molecules from the filtered list.
     *
     * @returns {TreeNode[]} An array of hidden TreeNode objects.
     */
    get hiddenMolecules(): TreeNode[] {
        return this.filteredMolecules.filter((node) => !node.visible);
    }
    /**
     * Handles the input event from the select element.
     *
     * @param {Event} e The input event.
     */
    handleInput(e: Event) {
        const target = e.target as HTMLSelectElement;
        this.$emit("update:modelValue", target.value);
        this.$emit("onChange", target.value);
    }
    /**
     * Lifecycle hook called when the component is mounted.
     */
    mounted() {
        this.validateModelValue();
    }
    /**
     * Watcher for the modelValue prop.
     */
    @Watch("modelValue")
    onModelValueChanged() {
        this.validateModelValue();
    }
    /**
     * Watcher for changes in the filtered molecules list.
     */
    @Watch("filteredMolecules")
    onFilteredMoleculesChanged() {
        this.validateModelValue();
    }
    /**
     * Validates that the current modelValue is a valid option. If not, it resets
     * the selection to the first available option or an empty string.
     */
    private validateModelValue() {
        const allOptions = [...this.visibleMolecules, ...this.hiddenMolecules];
        const validValues = allOptions.map((opt) => opt.id);
        if (this.modelValue && !validValues.includes(this.modelValue)) {
            // Current value is no longer valid.
            if (allOptions.length > 0 && allOptions[0].id) {
                // Reset to the first available option.
                this.handleInput({ target: { value: allOptions[0].id } } as any);
            } else {
                // No options available, reset to empty.
                this.handleInput({ target: { value: "" } } as any);
            }
        } else if (!this.modelValue && allOptions.length > 0 && allOptions[0].id) {
            // If no value is selected but there are options, select the first one.
            this.handleInput({ target: { value: allOptions[0].id } } as any);
        }
    }
}
</script>