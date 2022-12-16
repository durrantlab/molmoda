<template>
    <!-- For shapes -->
    <Section title="Shape" v-if="numSelectedShapes === 1">
        <FormFull v-model="constructedShapeForm" id="shape-style"></FormFull>
        <hr class="mt-4" />
    </Section>

    <!-- For molecules -->
    <Section title="Molecules">
        <div v-if="visibleMoleculeContainers.length === 0" class="pb-2">
            <p style="font-size: 14px">
                <span v-if="moleculeContainers.length === 0">
                    The workspace contains no molecules.
                </span>
                <span v-else>No molecules are currently visible.</span>
            </p>
        </div>
        <div v-else>
            <StylesAllMolTypes />
        </div>
    </Section>

    <!-- For shapes -->
    <div v-if="numSelectedShapes !== 1 || shapeContainers.length === 0">
        <hr class="mt-4" />
        <Section title="Shape" class="pb-2">
            <p style="font-size: 14px">
                <span v-if="shapeContainers.length === 0">
                    The workspace contains no shapes.
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
extractFlattenedContainers,
    getAllNodesFlattened,
} from "@/UI/Navigation/TreeView/TreeUtils";
import {
    IBox,
    IMolContainer,
    ISphere,
    SelectedType,
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
     * @returns {IMolContainer[]} All molcontainers that have a model
     *     (molecule).
     */
    get moleculeContainers(): IMolContainer[] {
        const allNodes = getAllNodesFlattened(this.$store.state.molecules);
        return extractFlattenedContainers(allNodes, { model: true });
    }

    /**
     * Get all visible molecule containers.
     *
     * @returns {IMolContainer[]} All molcontainers that have a model (molecule)
     *     and are visible.
     */
    get visibleMoleculeContainers(): IMolContainer[] {
        return extractFlattenedContainers(this.moleculeContainers, { visible: true });
    }

    /**
     * Get the number of selected shapes.
     *
     * @returns {number} The number of selected shapes.
     */
    get numSelectedShapes(): number {
        return this.selectedShapeContainers.length;
    }

    /**
     * Get all mol containers associated with shapes.
     *
     * @returns {IMolContainer[]} All molcontainers that have a shape.
     */
    get shapeContainers(): IMolContainer[] {
        const allNodes = getAllNodesFlattened(this.$store.state.molecules);
        return extractFlattenedContainers(allNodes, {shape: true});
    }

    /**
     * Get all mol containers associated with shapes that are selected..
     *
     * @returns {IMolContainer[]} All molcontainers that have a shape and are
     *     selected.
     */
    get selectedShapeContainers(): IMolContainer[] {
        return extractFlattenedContainers(this.shapeContainers, {selected: true});
    }

    /**
     * Get the first selected shape container.
     *
     * @returns {IMolContainer | undefined} The selected shape container.
     *     Undefined if none is selected.
     */
    get selectedShapeContainer(): IMolContainer | undefined {
        if (this.selectedShapeContainers === undefined) {
            return undefined;
        }
        return this.selectedShapeContainers[0];
    }

    /**
     * Sets the form data for the selected shape.
     *
     * @param {FormElement[]} vals  The form data to set.
     */
    set constructedShapeForm(vals: FormElement[]) {
        const shapeContainer = this.selectedShapeContainer;
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
        let color = this.selectedShapeContainer?.shape?.color;
        // If color doesn't start with #, convert to Hex.
        if (color && color[0] !== "#") {
            color = analyzeColor(color).hex;
        }
        const frm = [
            {
                id: "nameAndType",
                type: FormElemType.Text,
                val: `${this.selectedShapeContainer?.title} (${this.selectedShapeContainer?.shape?.type})`,
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
                val: this.selectedShapeContainer?.shape?.opacity,
            } as IFormRange,
        ] as FormElement[];

        if (this.selectedShapeContainer?.shape?.movable) {
            if (this.selectedShapeContainer?.shape?.type === ShapeType.Sphere) {
                frm.push({
                    id: "radius",
                    type: FormElemType.Number,
                    label: "Radius",
                    val: (this.selectedShapeContainer?.shape as ISphere).radius,
                } as IFormRange);
            } else {
                // Assuming it's a box, because arrows, cylinders, etc. will never
                // be movable.
                frm.push({
                    id: "dimensions",
                    type: FormElemType.Vector3D,
                    label: "Dimensions (X, Y, Z)",
                    val: (this.selectedShapeContainer?.shape as IBox)
                        ?.dimensions,
                    filterFunc: (val: number) => (val < 0 ? 0 : val),
                } as IFormVector3D);
            }
            frm.push({
                id: "center",
                type: FormElemType.Vector3D,
                label: "Center (X, Y, Z)",
                val: this.selectedShapeContainer?.shape?.center,
                description: "(Click atom to center)",
            } as IFormVector3D);
        }
        return frm;
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
