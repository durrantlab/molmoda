<template>
    <Section v-bind:key="molType" :level="2" :title="capitalize(molType)">
        <template v-slot:afterTitle>
            <!-- First, the icon switcher to hide this mol type. -->
            <IconSwitcher :useFirst="isVisible" :iconID1="['far', 'eye']" :iconID2="['far', 'eye-slash']"
                :icon2Style="{ color: 'lightgray' }" :width="24" @click="toggleVisible(molType)" :clickable="true"
                title="Visible" tipPlacement="left" />
        </template>

        <!-- The atoms styling section for this moltype, with optional
        colorselect. All molecule types have atoms representations. -->
        <FormSelect :id="'atoms-' + molType" v-model="atomsOption" :options="atomsStyleOptions"
            @onChange="updateMolecules(atomsOption)"></FormSelect>
        <ColorSchemeSelect v-if="atomsOption !== 'atoms-hidden'" v-model="selAndStyleToUse" :repName="atomsOption"
            :molType="molType" @onChange="updateMolecules(atomsOption)" />

        <!-- The protein (backbone) styling section for this moltype, with
        optional colorselect. Only if moltype is protein. -->
        <span v-if="molType === 'protein'">
            <FormSelect :id="'protein-' + molType" v-model="backboneOption" :options="proteinStyleOptions"
                @onChange="updateMolecules(backboneOption)"></FormSelect>
            <ColorSchemeSelect v-if="backboneOption !== 'backbone-hidden'" v-model="selAndStyleToUse" :repName="backboneOption"
                :molType="molType" @onChange="updateMolecules(backboneOption)" />
        </span>

        <!-- The surface styling section for this moltype, with optional
        colorselect. Only possible if not metal. -->
        <span v-if="molType !== 'metal'">
            <FormSelect :id="'surface-' + molType" v-model="surfaceOption" :options="metalStyleOptions"
                @onChange="updateMolecules(surfaceOption)"></FormSelect>
            <ColorSchemeSelect v-if="surfaceOption !== 'surface-hidden'" v-model="selAndStyleToUse" :repName="surfaceOption"
                :molType="molType" @onChange="updateMolecules(surfaceOption)" />
        </span>
    </Section>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment, no-case-declarations */

import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import Section from "@/UI/Layout/Section.vue";
// import Radios from "@/UI/Forms/Radios/Radios.vue";
import FormSelect from "@/UI/Forms/FormSelect.vue";

import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import IconSwitcher from "@/UI/Navigation/TitleBar/IconBar/IconSwitcher.vue";
import FormFull from "@/UI/Forms/FormFull/FormFull.vue";
import ColorSchemeSelect from "./ColorSchemeSelect.vue";
import { IUserArgOption } from "@/UI/Forms/FormFull/FormFullInterfaces";
import * as StyleManager from "@/Core/Styling/StyleManager";
import { defaultStyles } from "@/Core/Styling/SelAndStyleDefinitions";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { capitalize } from "@/Core/Utils/StringUtils";
import { AtomsRepresentation, BackBoneRepresentation, ISelAndStyle, Representation, SurfaceRepresentation } from "@/Core/Styling/SelAndStyleInterfaces";
import { S } from "memfs/lib/constants";

/**
 * StylesForMolType component. This contains all the representations (and color
 * selections) for a give molecule type (e.g., proteins). It gets used multiple
 * times, once for each molecule type. See StylesAllMolTypes.vue component.
 */
@Options({
    components: {
        Section,
        FormSelect,
        IconSwitcher,
        FormFull,
        ColorSchemeSelect,
    },
})
export default class StylesForMolType extends Vue {
    @Prop({ required: true }) selAndStyle!: ISelAndStyle;
    @Prop({ required: true }) molType!: TreeNodeType;

    isVisible = true;
    atomsOption = AtomsRepresentation.Hidden;
    backboneOption = BackBoneRepresentation.Hidden;
    surfaceOption = SurfaceRepresentation.Hidden;

    selAndStyleToUse: ISelAndStyle = {};

    /**
     * Watches the style prop and updates the styleToUse accordingly.
     */
    @Watch("style")
    onStyleChange() {
        alert(JSON.stringify(this.selAndStyle));
        this.selAndStyleToUse = this.selAndStyle;
    }

    proteinStyleOptions = [
        { description: "Backbone: Hidden", val: BackBoneRepresentation.Hidden },
        { description: "Backbone: Cartoon", val: BackBoneRepresentation.Cartoon },
        // {description: 'Protein: Tubes', val: 'tubes'},
    ] as IUserArgOption[];

    metalStyleOptions = [
        { description: "Surface: Hidden", val: SurfaceRepresentation.Hidden },
        { description: "Surface", val: SurfaceRepresentation.Surface },
    ] as IUserArgOption[];

    /**
     * Get the atom styles to use as options in the select. This is a computed
     * rather than data variable because it changes depending on other variables.
     *
     * @returns {IUserArgOption[]}  Array of option objects.
     */
    get atomsStyleOptions(): IUserArgOption[] {
        let options = [
            { description: "Atoms: Hidden", val: AtomsRepresentation.Hidden },
        ] as IUserArgOption[];

        if (this.molType !== "metal") {
            options.push(
                ...([
                    { description: "Atoms: Lines", val: AtomsRepresentation.Line },
                    { description: "Atoms: Sticks", val: AtomsRepresentation.Stick },
                ] as IUserArgOption[])
            );
        }

        options.push({
            description: "Atoms: Spheres",
            val: AtomsRepresentation.Sphere,
        } as IUserArgOption);

        return options;
    }

    /**
     * Toggle the visibility of a molecule.
     *
     * @param {TreeNodeType} type  The type of molecule to toggle.
     */
    toggleVisible(type: TreeNodeType) {
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
     * @param {string} rep  The name of the representation. For example,
     *                          "atoms-hidden".
     */
    updateMolecules(rep: Representation) {
        // Copy the styles. As any to avoid typescript errors. TODO: Seems like
        // this should happen in Styles.vue
        let style = (this.selAndStyleToUse ? { ...this.selAndStyleToUse } : {}) as any;

        // If it's not already set and not a hidden representation, set the
        // style. Use default.
        if (
            style[rep] === undefined &&
            [AtomsRepresentation.Hidden, BackBoneRepresentation.Hidden, SurfaceRepresentation.Hidden].indexOf(
                rep
            ) === -1
        ) {
            // This required to deal with restoring a viz after everything set to
            // hidden.
            // let styleUpdated = this.style === undefined ? {} : { ...this.style };

            // style[repName] should be like {color: 'spectrum'}.

            // @ts-ignore
            style[rep] = defaultStyles[this.molType][0][rep];

            // (Styles.currentStyles[this.molType] as any)[0][
            //     repName
            // ];

            // Happens when turning surface on for first time.
            if (style[rep] === undefined) style[rep] = {};
        }

        switch (rep) {
            // Deal items with hidden visualizations. Delete entries that are
            // incompatible with hidden.
            case AtomsRepresentation.Hidden:
                if (style.line) delete style.line;
                if (style.stick) delete style.stick;
                if (style.sphere) delete style.sphere;
                break;
            case BackBoneRepresentation.Hidden:
                if (style.cartoon) delete style.cartoon;
                break;
            case SurfaceRepresentation.Hidden:
                if (style.surface) delete style.surface;
                break;

            // In case of atoms, representations are mutually exclusive. So delete
            // other representations that might conflict with this one.
            case AtomsRepresentation.Line:
                if (style.stick) delete style.stick;
                if (style.sphere) delete style.sphere;
                break;
            case AtomsRepresentation.Stick:
                if (style.line) delete style.line;
                if (style.sphere) delete style.sphere;

                // If it's a protein and the representation is stick, set the
                // radius to 0.2. The goal here is to make the protein stick be
                // thinner than any ligand stick.
                style[rep]["radius"] =
                    this.molType === "protein" ? 0.1 : 0.4;

                break;
            case AtomsRepresentation.Sphere:
                if (style.line) delete style.line;
                if (style.stick) delete style.stick;
                break;
        }

        StyleManager.currentSelsAndStyles[this.molType] = [style];
        StyleManager.updateStylesInViewer(this.molType);

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
        this._setInitialSelectedStyles(this.selAndStyle);
        this.selAndStyleToUse = this.selAndStyle;
        this.updateMolecules(this.atomsOption);
    }

    /**
     * Set the initial values to use in the select.
     *
     * @param {ISelAndStyle} style  The style name to selectino to use.
     */
    private _setInitialSelectedStyles(style: ISelAndStyle) {
        if (style === undefined) {
            // Happens when used has hidden all styles.
            style = {};
        }

        if (style.sphere) {
            this.atomsOption = AtomsRepresentation.Sphere;
        } else if (style.stick) {
            this.atomsOption = AtomsRepresentation.Stick;
        } else if (style.line) {
            this.atomsOption = AtomsRepresentation.Line;
        } else {
            this.atomsOption = AtomsRepresentation.Hidden;
        }

        if (style.cartoon) {
            this.backboneOption = BackBoneRepresentation.Cartoon;
        } else {
            this.backboneOption = BackBoneRepresentation.Hidden;
        }

        if (style.surface) {
            this.surfaceOption = SurfaceRepresentation.Surface;
        } else {
            this.surfaceOption = SurfaceRepresentation.Hidden;
        }
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
