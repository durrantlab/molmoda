<template>
    <Section v-bind:key="molType" :level="2" :title="capitalize(molType)">
        <template v-slot:afterTitle>
            <!-- First, the icon switcher to hide this mol type. -->
            <IconSwitcher
                :useFirst="isVisible"
                :iconID1="['far', 'eye']"
                :iconID2="['far', 'eye-slash']"
                :icon2Style="{ color: 'lightgray' }"
                :width="24"
                @click="toggleVisible(molType)"
                :clickable="true"
                title="Visible"
                tipPlacement="left"
            />
        </template>

        <!-- The atoms styling section for this moltype, with optional colorselect
    -->
        <FormSelect
            :id="'atoms-' + molType"
            v-model="atomsOption"
            :options="atomsStyleOptions"
            @onChange="updateMolecules(atomsOption)"
        ></FormSelect>
        <ColorSelect
            v-if="atomsOption !== 'atoms-hidden'"
            v-model="styleToUse"
            :repName="atomsOption"
            @onChange="updateMolecules(atomsOption)"
            :allowColorCarbons="molType !== 'metal'"
            :allowSpectrum="false"
            :allowSecondaryStructure="molType === 'protein'"
        />

        <!-- The protein (backbone) styling section for this moltype, with optional
    colorselect -->
        <FormSelect
            v-if="molType === 'protein'"
            :id="'protein-' + molType"
            v-model="backboneOption"
            :options="proteinStyleOptions"
            @onChange="updateMolecules(backboneOption)"
        ></FormSelect>
        <ColorSelect
            v-if="backboneOption !== 'backbone-hidden'"
            v-model="styleToUse"
            :repName="backboneOption"
            @onChange="updateMolecules(backboneOption)"
            :allowColorByElement="false"
            :allowColorCarbons="false"
        />

        <!-- The surface styling section for this moltype, with optional colorselect
    -->
        <FormSelect
            v-if="molType !== 'metal'"
            :id="'surface-' + molType"
            v-model="surfaceOption"
            :options="metalStyleOptions"
            @onChange="updateMolecules(surfaceOption)"
        ></FormSelect>
        <ColorSelect
            v-if="surfaceOption !== 'surface-hidden'"
            v-model="styleToUse"
            :repName="surfaceOption"
            @onChange="updateMolecules(surfaceOption)"
            :allowSpectrum="false"
            :allowSecondaryStructure="molType === 'protein'"
        />
    </Section>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment, no-case-declarations */

import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import Section from "@/UI/Layout/Section.vue";
import { capitalize } from "@/Core/Utils";
// import Radios from "@/UI/Forms/Radios/Radios.vue";
import FormSelect from "@/UI/Forms/FormSelect.vue";

// @ts-ignore
import isEqual from "lodash.isequal";
import { IStyle, MolType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import IconSwitcher from "@/UI/Navigation/TitleBar/IconBar/IconSwitcher.vue";
import FormFull from "@/UI/Forms/FormFull/FormFull.vue";
import ColorSelect from "./ColorSelect/ColorSelect.vue";
import { IFormOption } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { defaultStyles } from "@/FileSystem/LoadSaveMolModels/Types/DefaultStyles";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

export interface IStyleForMolType {
    style: IStyle;
    molType: MolType;
}

/**
 * StylesForMolType component
 */
@Options({
    components: {
        Section,
        FormSelect,
        IconSwitcher,
        FormFull,
        ColorSelect,
    },
})
export default class StylesForMolType extends Vue {
    @Prop({ required: true }) style!: IStyle;
    @Prop({ required: true }) molType!: MolType;

    isVisible = true;
    atomsOption = "atoms-hidden";
    backboneOption = "backbone-hidden";
    surfaceOption = "surface-hidden";

    styleToUse: IStyle = {};

    /**
     * Watches the style prop and updates the styleToUse accordingly.
     */
    @Watch("style")
    onStyleChange() {
        this.styleToUse = this.style;
    }

    proteinStyleOptions = [
        { description: "Backbone: Hidden", val: "backbone-hidden" },
        { description: "Backbone: Cartoon", val: "cartoon" },
        // {description: 'Protein: Tubes', val: 'tubes'},
    ] as IFormOption[];

    metalStyleOptions = [
        { description: "Surface: Hidden", val: "surface-hidden" },
        { description: "Surface", val: "surface" },
    ] as IFormOption[];

    /**
     * Get the atom styles to use as options in the select. This is a computed
     * rather than data variable because it changes depending on other variables.
     *
     * @returns {IFormOption[]}  Array of option objects.
     */
    get atomsStyleOptions(): IFormOption[] {
        let options = [
            { description: "Atoms: Hidden", val: "atoms-hidden" },
        ] as IFormOption[];

        if (this.molType !== "metal") {
            options.push(
                ...([
                    { description: "Atoms: Lines", val: "line" },
                    { description: "Atoms: Sticks", val: "stick" },
                ] as IFormOption[])
            );
        }

        options.push({
            description: "Atoms: Spheres",
            val: "sphere",
        } as IFormOption);

        return options;
    }

    /**
     * Toggle the visibility of a molecule.
     *
     * @param {MolType} type  The type of molecule to toggle.
     */
    toggleVisible(type: MolType) {
        this.isVisible = !this.isVisible;
        let nodesOfThisType = (
            this.$store.state.molecules as TreeNodeList
        ).filters
            .keepType(type, true)
            .filters.keepVisible();

        nodesOfThisType.forEach((node) => {
            node.visible = this.isVisible;
            node.viewerDirty = true;
        });
    }

    /**
     * Update the style of a molecule.
     *
     * @param {string} repName  The name of the representation. For example,
     *                          "atoms-hidden".
     */
    updateMolecules(repName: string) {
        // TODO: Seems like this should happen in Styles.vue
        let style = this.styleToUse ? { ...this.styleToUse } : {};

        // Deal items with hidden visualizations. Delete entries that are
        // incompatible with hidden.
        switch (repName) {
            case "atoms-hidden":
                if (style.line) {
                    delete style.line;
                }
                if (style.stick) {
                    delete style.stick;
                }
                if (style.sphere) {
                    delete style.sphere;
                }
                break;
            case "backbone-hidden":
                if (style.cartoon) {
                    delete style.cartoon;
                }
                break;
            case "surface-hidden":
                if (style.surface) {
                    delete style.surface;
                }
                break;
            default:
                // Not hidden, so use specified value.

                // This required to deal with restoring a viz after everything set to
                // hidden.
                // let styleUpdated = this.style === undefined ? {} : { ...this.style };

                // @ts-ignore
                let val = style[repName];
                if (val === undefined) {
                    val = (defaultStyles[this.molType] as any)[0][repName];
                    // val should be like {color: 'spectrum'}.

                    if (val === undefined) {
                        // Happens when turning surface on for first time.
                        val = {};
                    }
                }

                (style as any)[repName] = val;
        }

        // In case of atoms, representations are mutually exclusive.
        switch (repName) {
            case "line":
                if (style.stick) {
                    delete style.stick;
                }
                if (style.sphere) {
                    delete style.sphere;
                }
                break;
            case "stick":
                if (style.line) {
                    delete style.line;
                }
                if (style.sphere) {
                    delete style.sphere;
                }
                break;
            case "sphere":
                if (style.line) {
                    delete style.line;
                }
                if (style.stick) {
                    delete style.stick;
                }
                break;
        }

        // iterate through terminal nodes
        let molecules = this.$store.state["molecules"] as TreeNodeList;

        const terminalNodes = molecules.filters.onlyTerminal;
        for (let idx = 0; idx < terminalNodes.length; idx++) {
            let node = terminalNodes.get(idx);
            if (!node.type || !node.styles || !node.visible) {
                continue;
            }

            // Check if the node type matches this style
            if (node.type === this.molType) {
                // Add the styles to the node list if it's not empty ({}).
                node.styles = [];
                if (!isEqual(style, {})) {
                    node.styles.push(style);
                }
                // Mark this for rerendering in viewer.
                node.viewerDirty = true;
            }
        }

        // console.log("New molecules:", molecules);

        this.$store.commit("setVar", {
            name: "molecules",
            val: molecules,
        });

        // NOTE: No need to emit up. Parent component detects changes in
        // store.state.molecules.
    }

    /**
     * Capitalize the first letter of a string. Echos utility function.
     *
     * @param {string} str  The string to capitalize.
     * @returns {string} The capitalized string.
     */
    capitalize(str: string): string {
        return capitalize(str);
    }

    /**
     * Runs when the Vue component is mounted.
     */
    mounted() {
        this._setInitialSelectVals(this.style);
        this.styleToUse = this.style;
    }

    /**
     * Set the initial values to use in the select.
     *
     * @param {IStyle} style  The style name to selectino to use.
     */
    private _setInitialSelectVals(style: IStyle) {
        if (style === undefined) {
            // Happens when used has hidden all styles.
            style = {};
        }

        if (style.sphere) {
            this.atomsOption = "sphere";
        } else if (style.stick) {
            this.atomsOption = "stick";
        } else if (style.line) {
            this.atomsOption = "line";
        } else {
            this.atomsOption = "atoms-hidden";
        }

        if (style.cartoon) {
            this.backboneOption = "cartoon";
        } else {
            this.backboneOption = "backbone-hidden";
        }

        if (style.surface) {
            this.surfaceOption = "surface";
        } else {
            this.surfaceOption = "surface-hidden";
        }
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
