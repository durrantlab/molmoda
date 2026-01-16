<template>
    <span>
        <!-- <div class="container-fluid"> -->
        <!-- <div class="row"> -->
        <!-- @onChange="onDataUpdated" -->
        <!-- cls="border-0 mt-2" -->
        <!-- cls="px-3" -->
        <FormWrapper :label="regionsInTree ? 'Load from Sphere or Box Region' : undefined
            " :disabled="disabled">
            <FormSelect v-if="regionsInTree" :disabled="disabled" :options="regionsInTree"
                :modelValue="selectedRegionId" @onChange="onRegionSelected">
            </FormSelect>
        </FormWrapper>

        <FormWrapper :label="regionNameToUse + 'Dimensions (X, Y, Z)'" :disabled="disabled" v-if="isBox">
            <!-- :placeHolder="placeHolder" -->
            <!-- :filterFunc="filterFunc" -->
            <FormVector3D v-model="modelValueToUse.dimensions" :id="'dimens-' + id" :disabled="disabled"
                :description="description" @onChange="resetSelected" styl="padding-left: 12px; padding-right: 12px;"
                :delayBetweenChangesDetected="0" />
        </FormWrapper>
        <FormWrapper :label="regionNameToUse + 'Radius'" :disabled="disabled" v-else>
            <!-- :placeHolder="placeHolder" -->
            <!-- :filterFunc="filterFunc" -->
            <FormInput v-model="modelValueToUse.radius" :id="id + '-radius'" :disabled="disabled"
                :description="description" styl="padding-left: 12px; padding-right: 12px;" @onChange="onRadiusChange"
                placeHolder="Radius..." />
        </FormWrapper>

        <FormWrapper :label="regionNameToUse + 'Center (X, Y, Z)'" :disabled="disabled">
            <!-- :placeHolder="placeHolder" -->
            <!-- :filterFunc="filterFunc" -->
            <FormVector3D v-model="modelValueToUse.center" :id="'center-' + id" :disabled="disabled"
                :description="description" @onChange="resetSelected" styl="padding-left: 12px; padding-right: 12px;"
                :delayBetweenChangesDetected="0" />
        </FormWrapper>
        <!-- </div> -->
        <!-- </div> -->
        <FormElementDescription :description="description" :warning="warningToUse"></FormElementDescription>
        <!-- <FormElementDescription
            v-if="regionsInTree === undefined"
            description="No sphere or box regions in project. Please define a box center and dimensions below."
        ></FormElementDescription> -->
    </span>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { randomID } from "@/Core/Utils/MiscUtils";
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import FormElementDescription from "@/UI/Forms/FormElementDescription.vue";
import FormVector3D from "../FormVector3D.vue";
import FormWrapper from "../FormWrapper.vue";
import FormSelect from "../FormSelect.vue";
import { IUserArgOption } from "../FormFull/FormFullInterfaces";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import Alert from "../../Layout/Alert.vue";
import {
    IBox,
    ISphere,
    ISphereOrBox,
    RegionType,
} from "../../Navigation/TreeView/TreeInterfaces";
import FormInput from "../FormInput.vue";
import { createNaturalSortFunc } from "@/Core/Utils/StringUtils"

// const sortFunc = (a: TreeNode, b: TreeNode) => {
//     if (a.title < b.title) {
//         return -1;
//     }
//     if (a.title > b.title) {
//         return 1;
//     }
//     return 0;
// };

const defaultVals = {
    center: [0, 0, 0],
    dimensions: [20, 20, 20],
    radius: 20,
} as ISphereOrBox;

/**
 * FormSelectRegion component
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
export default class FormSelectRegion extends Vue {
    @Prop({ required: true }) modelValue!: ISphereOrBox | null | undefined;
    @Prop({ default: randomID() }) id!: string;
    // @Prop({ default: "placeholder" }) placeHolder!: string;
    @Prop({ default: false }) disabled!: boolean;
    @Prop({}) description!: string;
    @Prop({ default: false }) readonly!: boolean;
    @Prop({ default: "" }) regionName!: string;
    @Prop({ required: false }) warningFunc!: (val: any) => string;
    // @Prop({ required: false }) filterFunc!: Function;

    selectedRegionId = "noneSelected";
    modelValueToUse = defaultVals;
    isBox = true;
    warningToUse = "";

    /**
     * Get the name of the region to use.
     *
     * @returns {string} The name of the region to use.
     */
    get regionNameToUse(): string {
        // If doesn't end in " ", add " " to end.
        if (this.regionName.length > 0 && this.regionName.slice(-1) !== " ") {
            return this.regionName + " ";
        }
        return this.regionName;
    }

    /**
     * Set the warning message (this.warningToUse).
     */
    setWarning() {
        if (this.warningFunc) {
            const modelValueForWarning = JSON.parse(
                JSON.stringify(this.modelValueToUse)
            );

            if (this.isBox) {
                delete modelValueForWarning.radius;
            } else {
                delete modelValueForWarning.dimensions;
            }

            this.warningToUse = this.warningFunc(modelValueForWarning);
            return;
        }
        this.warningToUse = "";
    }

    /**
     * When modelValueToUse changes, emit "update:modelValue" and "onChange".
     */
    @Watch("modelValueToUse", { deep: true, immediate: true })
    onModelValueToUseChanged() {
        this.$emit("update:modelValue", this.modelValueToUse);

        // In some circumstances (e.g., changing values in an object), not
        // reactive. Emit also "onChange" to signal the value has changed.
        this.$emit("onChange");
    }

    /**
     * When modelValue changes, update modelValueToUse.
     */
    @Watch("modelValue", { deep: true, immediate: true })
    onModelValueChanged() {
        if (this.modelValue === null || this.modelValue === undefined) {
            this.modelValueToUse = JSON.parse(JSON.stringify(defaultVals));
            this.selectedRegionId = 'noneSelected';
            return;
        }

        // Make sure radius and dimensions > 0.1.
        if (
            (this.modelValue as ISphere).radius !== undefined &&
            (this.modelValue as ISphere).radius < 0.1
        ) {
            this.modelValue.radius = 0.1;
        }

        if ((this.modelValue as IBox).dimensions !== undefined) {
            if ((this.modelValue as IBox).dimensions[0] < 0.1) {
                (this.modelValue as IBox).dimensions[0] = 0.1;
            }

            if ((this.modelValue as IBox).dimensions[1] < 0.1) {
                (this.modelValue as IBox).dimensions[1] = 0.1;
            }

            if ((this.modelValue as IBox).dimensions[2] < 0.1) {
                (this.modelValue as IBox).dimensions[2] = 0.1;
            }
        }

        this.modelValueToUse = this.modelValue;
        this.setWarning();
    }

    /**
     * If you change the values in the form, reset the selected region to be
     * none selected.
     */
    resetSelected() {
        this.selectedRegionId = 'noneSelected';
    }

    /**
     * Updates the dimensions based on the radius when the radius input changes.
     * Also resets the selected region.
     */
    onRadiusChange() {
        this.resetSelected();
        if (this.modelValueToUse.radius) {
            const dimen = this.modelValueToUse.radius * 2;
            this.modelValueToUse.dimensions = [dimen, dimen, dimen];
        }
    }

    /**
     * Runs when the region is selected.
     *
     * @param {string} id  The id of the region that was selected.
     */
    onRegionSelected(id: string) {
        if (id === "noneSelected") {
            this.selectedRegionId = 'noneSelected';
            return;
        }

        const sigFigFactor = 10000;

        // Get the node corresponding to that id
        const region = this.$store.state["molecules"].filters.onlyId(id)
            .region as ISphere | IBox;
        this.modelValueToUse.center = region.center.map(
            (v) => Math.round(sigFigFactor * v) / sigFigFactor
        ) as [number, number, number];

        if (region.type === RegionType.Sphere) {
            this.modelValueToUse.radius = (region as ISphere).radius;
            const dimen =
                Math.round(sigFigFactor * 2 * this.modelValueToUse.radius) /
                sigFigFactor;
            this.modelValueToUse.dimensions = [dimen, dimen, dimen];
            this.isBox = false;
        } else {
            this.modelValueToUse.dimensions = (region as IBox).dimensions.map(
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

        this.selectedRegionId = id;
        this.handleInput();
    }

    /**
     * Get all the regions in the tree. Return as options for the select.
     *
     * @returns {IUserArgOption[] | undefined} The regions in the tree. Undefined
     *    if there are no regions in the tree.
     */
    get regionsInTree(): IUserArgOption[] | undefined {
        let treeNodeList: TreeNodeList = this.$store.state["molecules"];
        treeNodeList = treeNodeList.filters.keepRegions(true, true);

        // Keep only spheres and boxes.
        treeNodeList = treeNodeList.filter((node) => {
            if (node.region === undefined) {
                return false;
            }
            return (
                node.region.type === RegionType.Sphere ||
                node.region.type === RegionType.Box
            );
        });

        const visibleNotselectedRegions: TreeNodeList = treeNodeList.filters
            .keepVisible(true, true)
            .filters.keepSelected(false, true);
        const visibleselectedRegions: TreeNodeList = treeNodeList.filters
            .keepVisible(true, true)
            .filters.keepSelected(true, true);
        const selectedNotVisible: TreeNodeList = treeNodeList.filters
            .keepVisible(false, true)
            .filters.keepSelected(true, true);
        const notVisibleNotSelected: TreeNodeList = treeNodeList.filters
            .keepVisible(false, true)
            .filters.keepSelected(false, true);

        if (
            visibleselectedRegions.length +
            visibleNotselectedRegions.length +
            selectedNotVisible.length +
            notVisibleNotSelected.length ===
            0
        ) {
            return undefined;
        }

        // Sort visibleNotselectedRegions
        // visibleNotselectedRegions.sort(sortFunc);
        // visibleselectedRegions.sort(sortFunc);
        // selectedNotVisible.sort(sortFunc);
        // notVisibleNotSelected.sort(sortFunc);

        visibleNotselectedRegions.sort(createNaturalSortFunc<TreeNode>((node: TreeNode) => { return node.title; }));
        visibleselectedRegions.sort(createNaturalSortFunc<TreeNode>((node: TreeNode) => { return node.title; }));
        selectedNotVisible.sort(createNaturalSortFunc<TreeNode>((node: TreeNode) => { return node.title; }));
        notVisibleNotSelected.sort(createNaturalSortFunc<TreeNode>((node: TreeNode) => { return node.title; }));

        const options = [] as IUserArgOption[];

        options.push({
            description: "Select a region to load...",
            val: "noneSelected",
            // disabled: true,
        });

        if (visibleselectedRegions.length > 0) {
            options.push({
                description: "Visible, selected regions",
                val: undefined,
                disabled: true,
            });

            visibleselectedRegions.forEach((node) => {
                options.push({
                    description: node.title,
                    val: node.id,
                });
            });
        }

        if (visibleNotselectedRegions.length > 0) {
            options.push({
                description: "Visible regions",
                val: undefined,
                disabled: true,
            });

            visibleNotselectedRegions.forEach((node) => {
                options.push({
                    description: node.title,
                    val: node.id,
                });
            });
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
        }

        if (this.selectedRegionId === undefined) {
            this.selectedRegionId = options[0].val;
            this.onRegionSelected(this.selectedRegionId as string);
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

    /**
     * Runs when the component is mounted.
     */
    mounted() {
        this.onModelValueToUseChanged();
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
// Input of type color
// .form-control-color {
//     width: 100%;
// }</style>
