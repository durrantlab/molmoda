<template>
    <span>
        <!-- For regions -->
        <Section title="Region" v-if="numselectedRegions === 1">
            <FormFull
                v-model="constructedRegionForm"
                id="region-style"
            ></FormFull>
            <hr class="mt-4" />
        </Section>

        <!-- For molecules -->
        <Section title="Molecules">
            <div v-if="visibleTreeNodes.length === 0" class="pb-0">
                <p class="mb-0" style="font-size: 14px">
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
        <div
            v-if="numselectedRegions !== 1 || treeNodesWithRegions.length === 0"
        >
            <hr class="mt-4 mb-3" />
            <Section title="Region" class="pb-2">
                <p style="font-size: 14px">
                    <span v-if="treeNodesWithRegions.length === 0">
                        The workspace contains no regions.
                    </span>
                    <span v-else-if="numselectedRegions === 0">
                        No region selected (clicked) in the Navigator panel
                    </span>
                    <span v-else-if="numselectedRegions > 1">
                        Select only one region in the Navigator panel
                    </span>
                </p>
            </Section>
        </div>
    </span>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import FormInput from "@/UI/Forms/FormInput.vue";
import FormSelect from "@/UI/Forms/FormSelect.vue";
import Section from "@/UI/Layout/Section.vue";
import StylesAllMolTypes from "./Styles/StylesAllMolTypes.vue";
import {
    IBox,
    ISphere,
    RegionType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    UserArg,
    UserArgType,
    IUserArgColor,
    IUserArgRange,
    IUserArgText,
    IUserArgVector3D,
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
        const allNodes = (this.$store.state.molecules as TreeNodeList)
            .flattened;
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
    get numselectedRegions(): number {
        return this.treeNodesWithselectedRegions.length;
    }

    /**
     * Get all mol containers associated with regions.
     *
     * @returns {TreeNodeList} All tree nodes that have a region.
     */
    get treeNodesWithRegions(): TreeNodeList {
        const allNodes = (this.$store.state.molecules as TreeNodeList)
            .flattened;
        return allNodes.filters.keepRegions();
    }

    /**
     * Get all mol containers associated with regions that are selected..
     *
     * @returns {TreeNodeList} All tree nodes that have a region and are
     *     selected.
     */
    get treeNodesWithselectedRegions(): TreeNodeList {
        return this.treeNodesWithRegions.filters.keepSelected();
    }

    /**
     * Get the first selected region container.
     *
     * @returns {TreeNode | undefined} The selected region container.
     *     Undefined if none is selected.
     */
    get firstSelectedTreeNodeWithRegion(): TreeNode | undefined {
        if (this.treeNodesWithselectedRegions === undefined) {
            return undefined;
        }
        return this.treeNodesWithselectedRegions.get(0);
    }

    /**
     * Sets the form data for the selected region.
     *
     * @param {UserArg[]} vals  The form data to set.
     */
    set constructedRegionForm(vals: UserArg[]) {
        const regionContainer = this.firstSelectedTreeNodeWithRegion;
        if (!regionContainer || !regionContainer.region) {
            return;
        }

        const valsObj: { [key: string]: any } = {};
        for (const val of vals) {
            valsObj[val.id] = val.val;
        }

        regionContainer.region.color = valsObj["color"];
        regionContainer.region.opacity = valsObj["opacity"];

        if (regionContainer.region.movable) {
            regionContainer.region.center = valsObj["center"];

            if (regionContainer.region.type === RegionType.Sphere) {
                (regionContainer.region as ISphere).radius = valsObj["radius"];
            } else {
                // Assuming it's a box, because arrows, cylinders, etc. will never
                // be movable.
                (regionContainer.region as IBox).dimensions =
                    valsObj["dimensions"];
            }
        }

        regionContainer.viewerDirty = true;
    }

    /**
     * Create the form data for the selected region.
     *
     * @returns {UserArg[]} The form data for the selected region.
     */
    get constructedRegionForm(): UserArg[] {
        let color = this.firstSelectedTreeNodeWithRegion?.region?.color;
        // If color doesn't start with #, convert to Hex.
        if (color && color[0] !== "#") {
            color = analyzeColor(color).hex;
        }
        const frm = [
            {
                id: "nameAndType",
                type: UserArgType.Text,
                val: `${this.firstSelectedTreeNodeWithRegion?.title} (${this.firstSelectedTreeNodeWithRegion?.region?.type})`,
                enabled: false,
            } as IUserArgText,
            {
                id: "color",
                type: UserArgType.Color,
                val: color,
            } as IUserArgColor,
            {
                id: "opacity",
                type: UserArgType.Range,
                label: "Opacity",
                min: 0,
                max: 1,
                step: 0.01,
                val: this.firstSelectedTreeNodeWithRegion?.region?.opacity,
            } as IUserArgRange,
        ] as UserArg[];

        if (this.firstSelectedTreeNodeWithRegion?.region?.movable) {
            if (
                this.firstSelectedTreeNodeWithRegion?.region?.type ===
                RegionType.Sphere
            ) {
                frm.push({
                    id: "radius",
                    type: UserArgType.Number,
                    label: "Radius",
                    val: (
                        this.firstSelectedTreeNodeWithRegion?.region as ISphere
                    ).radius,
                } as IUserArgRange);
            } else {
                // Assuming it's a box, because arrows, cylinders, etc. will never
                // be movable.
                frm.push({
                    id: "dimensions",
                    type: UserArgType.Vector3D,
                    label: "Dimensions (X, Y, Z)",
                    val: (this.firstSelectedTreeNodeWithRegion?.region as IBox)
                        ?.dimensions,
                    filterFunc: (val: number) => (val < 0 ? 0 : val),
                } as IUserArgVector3D);
            }
            frm.push({
                id: "center",
                type: UserArgType.Vector3D,
                label: "Center (X, Y, Z)",
                val: this.firstSelectedTreeNodeWithRegion?.region?.center,
                description: "(Click atom to center)",
            } as IUserArgVector3D);
        }
        return frm;
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
