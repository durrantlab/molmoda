<template>
    <span>
        <!-- <div class="container-fluid"> -->
        <!-- <div class="row"> -->
        <!-- @onChange="onDataUpdated" -->
        <!-- cls="border-0 mt-2" -->
        <!-- cls="px-3" -->
        <FormWrapper
            :label="shapesInTree ? 'Load from Sphere or Box Shape' : undefined"
            :disabled="disabled"
        >
            <FormSelect
                v-if="shapesInTree"
                :disabled="disabled"
                :options="shapesInTree"
                :modelValue="selectedShapeId"
                @onChange="onShapeSelected"
            >
            </FormSelect>
            <Alert v-else type="warning" extraClasses="mb-0">
                No sphere or box regions in workspace. Please define a box center
                and dimensions below.
            </Alert>
        </FormWrapper>

        <FormWrapper
            label="Dimensions (X, Y, Z)"
            :disabled="disabled"
            v-if="isBox"
        >
            <!-- :placeHolder="placeHolder" -->
            <!-- :filterFunc="filterFunc" -->
            <FormVector3D
                v-model="modelValueToUse.dimensions"
                :id="id + '-dimens'"
                :disabled="disabled"
                :description="description"
                @onChange="resetSelected"
                styl="padding-left: 12px; padding-right: 12px;"
            />
        </FormWrapper>
        <FormWrapper
            label="Radius"
            :disabled="disabled"
            v-else
        >
            <!-- :placeHolder="placeHolder" -->
            <!-- :filterFunc="filterFunc" -->
            <FormInput
                v-model="modelValueToUse.radius"
                :id="id + '-radius'"
                :disabled="disabled"
                :description="description"
                styl="padding-left: 12px; padding-right: 12px;"
                @onChange="resetSelected"
            />
        </FormWrapper>

        <FormWrapper
            label="Center (X, Y, Z)"
            :disabled="disabled"
        >
            <!-- :placeHolder="placeHolder" -->
            <!-- :filterFunc="filterFunc" -->
            <FormVector3D
                v-model="modelValueToUse.center"
                :id="id + '-center'"
                :disabled="disabled"
                :description="description"
                @onChange="resetSelected"
                styl="padding-left: 12px; padding-right: 12px;"
            />
        </FormWrapper>
        <!-- </div> -->
        <!-- </div> -->
        <FormElementDescription
            v-if="description !== undefined"
            :htmlDescription="description"
        ></FormElementDescription>
    </span>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { randomID } from "@/Core/Utils";
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import FormElementDescription from "@/UI/Forms/FormElementDescription.vue";
import FormVector3D from "../FormVector3D.vue";
import FormWrapper from "../FormWrapper.vue";
import FormSelect from "../FormSelect.vue";
import { IFormOption } from "../FormFull/FormFullInterfaces";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import Alert from "../../Layout/Alert.vue";
import {
    IBox,
    ISphere,
    ISphereOrBox,
    ShapeType,
} from "../../Navigation/TreeView/TreeInterfaces";
import FormInput from "../FormInput.vue";

const sortFunc = (a: TreeNode, b: TreeNode) => {
    if (a.title < b.title) {
        return -1;
    }
    if (a.title > b.title) {
        return 1;
    }
    return 0;
};

const defaultVals = {
    center: [0, 0, 0],
    dimensions: [0, 0, 0],
    radius: 0,
} as ISphereOrBox;

/**
 * FormSelectShape component
 */
@Options({
    components: {
        FormElementDescription,
        FormVector3D,
        FormWrapper,
        FormSelect,
        Alert,
        FormInput,
    },
})
export default class FormSelectShape extends Vue {
    @Prop({ required: true }) modelValue!: ISphereOrBox | null | undefined;
    @Prop({ default: randomID() }) id!: string;
    // @Prop({ default: "placeholder" }) placeHolder!: string;
    @Prop({ default: false }) disabled!: boolean;
    @Prop({}) description!: string;
    @Prop({ default: false }) readonly!: boolean;
    // @Prop({ required: false }) filterFunc!: Function;

    selectedShapeId = "noneSelected";
    modelValueToUse = defaultVals;
    isBox = true;

    // Watch modelValueToUse
    @Watch("modelValueToUse", { deep: true, immediate: true })
    onModelValueToUseChanged() {
        this.$emit("update:modelValue", this.modelValueToUse);

        // In some circumstances (e.g., changing values in an object), not
        // reactive. Emit also "onChange" to signal the value has changed.
        this.$emit("onChange");
    }

    // Watch modelValue
    @Watch("modelValue", { deep: true, immediate: true })
    onModelValueChanged() {
        if (this.modelValue === null || this.modelValue === undefined) {
            this.modelValueToUse = defaultVals;
            return;
        }
        this.modelValueToUse = this.modelValue;
    }

    resetSelected() {
        this.selectedShapeId = "noneSelected";
    }

    onShapeSelected(id: string) {
        if (id === "noneSelected") {
            this.selectedShapeId = "noneSelected";
            return;
        }

        const sigFigFactor = 10000;

        // Get the node corresponding to that id
        const shape = this.$store.state["molecules"].filters.onlyId(id)
            .shape as ISphere | IBox;
        this.modelValueToUse.center = shape.center.map(
            (v) => Math.round(sigFigFactor * v) / sigFigFactor
        ) as [number, number, number];

        if (shape.type === ShapeType.Sphere) {
            this.modelValueToUse.radius = (shape as ISphere).radius;
            const dimen =
                Math.round(sigFigFactor * 2 * this.modelValueToUse.radius) /
                sigFigFactor;
            this.modelValueToUse.dimensions = [dimen, dimen, dimen];
            this.isBox = false;
        } else {
            this.modelValueToUse.dimensions = (shape as IBox).dimensions.map(
                (v) => Math.round(sigFigFactor * v) / sigFigFactor
            ) as [number, number, number];
            const halfDimens = this.modelValueToUse.dimensions.map(
                (v) => v / 2
            );
            this.modelValueToUse.radius =
                Math.round(
                    sigFigFactor *
                        Math.sqrt(
                            halfDimens[0] ** 2 +
                                halfDimens[1] ** 2 +
                                halfDimens[2] ** 2
                        )
                ) / sigFigFactor;
            this.isBox = true;
        }

        this.selectedShapeId = id;
        this.handleInput();
    }

    get shapesInTree(): IFormOption[] | undefined {
        let treeNodeList: TreeNodeList = this.$store.state["molecules"];
        treeNodeList = treeNodeList.filters.keepShapes(true, true);

        // Keep only spheres and boxes.
        treeNodeList = treeNodeList.filter((node) => {
            if (node.shape === undefined) {
                return false;
            }
            return (
                node.shape.type === ShapeType.Sphere ||
                node.shape.type === ShapeType.Box
            );
        });

        const visibleNotSelectedShapes: TreeNodeList = treeNodeList.filters
            .keepVisible(true, true)
            .filters.keepSelected(false, true);
        const visibleSelectedShapes: TreeNodeList = treeNodeList.filters
            .keepVisible(true, true)
            .filters.keepSelected(true, true);
        const selectedNotVisible: TreeNodeList = treeNodeList.filters
            .keepVisible(false, true)
            .filters.keepSelected(true, true);
        const notVisibleNotSelected: TreeNodeList = treeNodeList.filters
            .keepVisible(false, true)
            .filters.keepSelected(false, true);

        if (
            visibleSelectedShapes.length +
                visibleNotSelectedShapes.length +
                selectedNotVisible.length +
                notVisibleNotSelected.length ===
            0
        ) {
            return undefined;
        }

        // Sort visibleNotSelectedShapes
        visibleNotSelectedShapes.sort(sortFunc);
        visibleSelectedShapes.sort(sortFunc);
        selectedNotVisible.sort(sortFunc);
        notVisibleNotSelected.sort(sortFunc);

        const options = [] as IFormOption[];

        options.push({
            description: "Select a shape to load...",
            val: "noneSelected",
            // disabled: true,
        });

        if (visibleSelectedShapes.length > 0) {
            options.push({
                description: "Visible, selected regions",
                val: undefined,
                disabled: true,
            });

            visibleSelectedShapes.forEach((node) => {
                options.push({
                    description: node.title,
                    val: node.id,
                });
            });

            // if (this.selectedShapeId === undefined) {
            //     this.selectedShapeId = visibleSelectedShapes._nodes[0].id;
            //     this.onShapeSelected(this.selectedShapeId as string);
            // }
        }

        if (visibleNotSelectedShapes.length > 0) {
            options.push({
                description: "Visible regions",
                val: undefined,
                disabled: true,
            });

            visibleNotSelectedShapes.forEach((node) => {
                options.push({
                    description: node.title,
                    val: node.id,
                });
            });

            // if (this.selectedShapeId === undefined) {
            //     this.selectedShapeId = visibleNotSelectedShapes._nodes[0].id;
            //     this.onShapeSelected(this.selectedShapeId as string);
            // }
        }

        if (selectedNotVisible.length > 0) {
            options.push({
                description: "Selected regions",
                val: undefined,
                disabled: true,
            });

            selectedNotVisible.forEach((node) => {
                options.push({
                    description: node.title,
                    val: node.id,
                });
            });

            // if (this.selectedShapeId === undefined) {
            //     this.selectedShapeId = selectedNotVisible._nodes[0].id;
            //     this.onShapeSelected(this.selectedShapeId as string);
            // }
        }

        if (notVisibleNotSelected.length > 0) {
            options.push({
                description: "Hidden, unselected regions",
                val: undefined,
                disabled: true,
            });

            notVisibleNotSelected.forEach((node) => {
                options.push({
                    description: node.title,
                    val: node.id,
                });
            });

            // if (this.selectedShapeId === undefined) {
            //     this.selectedShapeId = notVisibleNotSelected._nodes[0].id;
            //     this.onShapeSelected(this.selectedShapeId as string);
            // }
        }

        if (this.selectedShapeId === undefined) {
            this.selectedShapeId = options[0].val;
            this.onShapeSelected(this.selectedShapeId as string);
        }

        return options;
    }

    /**
     * Let the parent component know of any changes, after user has not interacted
     * for a bit (to prevent rapid updates).
     *
     * @param {any} e  The value.
     */
    handleInput(e?: ISphereOrBox): void {
        if (e === undefined) {
            e = this.modelValueToUse;
        }

        // // Get "idx" data from target
        // const idx = parseInt(e.target.dataset.idx);
        // const newVals = JSON.parse(JSON.stringify(newModelValue));
        // let newVal = parseFloat(e.target.value);
        // if (this.filterFunc) {
        //     // If there's a filter funciton, update everything.
        //     newVal = this.filterFunc(newVal);
        // }
        // newVals[idx] = newVal;
        this.$emit("update:modelValue", e);
        // // In some circumstances (e.g., changing values in an object), not reactive.
        // // Emit also "onChange" to signal the value has changed.
        this.$emit("onChange");
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
// Input of type color
// .form-control-color {
//     width: 100%;
// }
</style>
