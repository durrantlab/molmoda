<template>
    <!-- For regions -->
    <Section title="Shape" v-if="numSelectedShapes === 1">
        <FormFull v-model="constructedShapeForm" id="shape-style"></FormFull>
        <hr class="mt-4" />
    </Section>

    <!-- For molecules -->
    <Section title="Molecules">
        <div v-if="visibleTreeNodes.length === 0" class="pb-2">
            <p style="font-size: 14px">
                <span v-if="treeNodesWithModel.length === 0">
                    The workspace contains no molecules.
                </span>
                <span v-else>No molecules are currently visible.</span>
            </p>
        </div>
        <div v-else>
            <StylesAllMolTypes />
        </div>
    </Section>

    <!-- For regions -->
    <div v-if="numSelectedShapes !== 1 || treeNodesWithShapes.length === 0">
        <hr class="mt-4" />
        <Section title="Shape" class="pb-2">
            <p style="font-size: 14px">
                <span v-if="treeNodesWithShapes.length === 0">
                    The workspace contains no regions.
                </span>
                <span v-else-if="numSelectedShapes === 0">
                    No shape selected (clicked) in the Navigator panel
                </span>
                <span v-else-if="numSelectedShapes > 1">
                    Select only one shape in the Navigator panel
                </span>
            </p>
        </Section>
    </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import FormInput from "@/UI/Forms/FormInput.vue";
import FormSelect from "@/UI/Forms/FormSelect.vue";
import FormCheckBox from "@/UI/Forms/FormCheckBox.vue";
import Section from "@/UI/Layout/Section.vue";
import StylesAllMolTypes from "./Styles/StylesAllMolTypes.vue";
import {
    IBox,
    ISphere,
    ShapeType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    FormElement,
    FormElemType,
    IFormColor,
    IFormRange,
    IFormText,
    IFormVector3D,
    IGenericFormElement,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import FormFull from "@/UI/Forms/FormFull/FormFull.vue";
import { analyzeColor } from "./Styles/ColorSelect/ColorConverter";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

/**
 * StylesPanel component
 */
@Options({
    components: {
        FormWrapper,
        FormInput,
        FormSelect,
        FormCheckBox,
        Section,
        StylesAllMolTypes,
        FormFull,
    },
})
export default class StylesPanel extends Vue {
    /**
     * Get all molecule containers.
     *
     * @returns {TreeNodeList} All tree nodes that have a model (molecule).
     */
    get treeNodesWithModel(): TreeNodeList {
        const allNodes = (this.$store.state.molecules as TreeNodeList).flattened;
        return allNodes.filters.keepModels();
    }

    /**
     * Get all visible molecule containers.
     *
     * @returns {TreeNodeList} All tree nodes that have a model (molecule)
     *     and are visible.
     */
    get visibleTreeNodes(): TreeNodeList {
        return this.treeNodesWithModel.filters.keepVisible();
    }

    /**
     * Get the number of selected regions.
     *
     * @returns {number} The number of selected regions.
     */
    get numSelectedShapes(): number {
        return this.treeNodesWithSelectedShapes.length;
    }

    /**
     * Get all mol containers associated with regions.
     *
     * @returns {TreeNodeList} All tree nodes that have a shape.
     */
    get treeNodesWithShapes(): TreeNodeList {
        const allNodes = (this.$store.state.molecules as TreeNodeList).flattened;
        return allNodes.filters.keepShapes();
    }

    /**
     * Get all mol containers associated with regions that are selected..
     *
     * @returns {TreeNodeList} All tree nodes that have a shape and are
     *     selected.
     */
    get treeNodesWithSelectedShapes(): TreeNodeList {
        return this.treeNodesWithShapes.filters.keepSelected();
    }

    /**
     * Get the first selected shape container.
     *
     * @returns {TreeNode | undefined} The selected shape container.
     *     Undefined if none is selected.
     */
    get firstSelectedTreeNodeWithShape(): TreeNode | undefined {
        if (this.treeNodesWithSelectedShapes === undefined) {
            return undefined;
        }
        return this.treeNodesWithSelectedShapes.get(0);
    }

    /**
     * Sets the form data for the selected shape.
     *
     * @param {FormElement[]} vals  The form data to set.
     */
    set constructedShapeForm(vals: FormElement[]) {
        const shapeContainer = this.firstSelectedTreeNodeWithShape;
        if (!shapeContainer || !shapeContainer.shape) {
            return;
        }

        const valsObj: { [key: string]: any } = {};
        for (const val of vals) {
            valsObj[val.id] = (val as IGenericFormElement).val;
        }

        shapeContainer.shape.color = valsObj["color"];
        shapeContainer.shape.opacity = valsObj["opacity"];

        if (shapeContainer.shape.movable) {
            shapeContainer.shape.center = valsObj["center"];

            if (shapeContainer.shape.type === ShapeType.Sphere) {
                (shapeContainer.shape as ISphere).radius = valsObj["radius"];
            } else {
                // Assuming it's a box, because arrows, cylinders, etc. will never
                // be movable.
                (shapeContainer.shape as IBox).dimensions =
                    valsObj["dimensions"];
            }
        }

        shapeContainer.viewerDirty = true;
    }

    /**
     * Create the form data for the selected shape.
     *
     * @returns {FormElement[]} The form data for the selected shape.
     */
    get constructedShapeForm(): FormElement[] {
        let color = this.firstSelectedTreeNodeWithShape?.shape?.color;
        // If color doesn't start with #, convert to Hex.
        if (color && color[0] !== "#") {
            color = analyzeColor(color).hex;
        }
        const frm = [
            {
                id: "nameAndType",
                type: FormElemType.Text,
                val: `${this.firstSelectedTreeNodeWithShape?.title} (${this.firstSelectedTreeNodeWithShape?.shape?.type})`,
                enabled: false,
            } as IFormText,
            {
                id: "color",
                type: FormElemType.Color,
                val: color,
            } as IFormColor,
            {
                id: "opacity",
                type: FormElemType.Range,
                label: "Opacity",
                min: 0,
                max: 1,
                step: 0.01,
                val: this.firstSelectedTreeNodeWithShape?.shape?.opacity,
            } as IFormRange,
        ] as FormElement[];

        if (this.firstSelectedTreeNodeWithShape?.shape?.movable) {
            if (this.firstSelectedTreeNodeWithShape?.shape?.type === ShapeType.Sphere) {
                frm.push({
                    id: "radius",
                    type: FormElemType.Number,
                    label: "Radius",
                    val: (this.firstSelectedTreeNodeWithShape?.shape as ISphere).radius,
                } as IFormRange);
            } else {
                // Assuming it's a box, because arrows, cylinders, etc. will never
                // be movable.
                frm.push({
                    id: "dimensions",
                    type: FormElemType.Vector3D,
                    label: "Dimensions (X, Y, Z)",
                    val: (this.firstSelectedTreeNodeWithShape?.shape as IBox)
                        ?.dimensions,
                    filterFunc: (val: number) => (val < 0 ? 0 : val),
                } as IFormVector3D);
            }
            frm.push({
                id: "center",
                type: FormElemType.Vector3D,
                label: "Center (X, Y, Z)",
                val: this.firstSelectedTreeNodeWithShape?.shape?.center,
                description: "(Click atom to center)",
            } as IFormVector3D);
        }
        return frm;
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
